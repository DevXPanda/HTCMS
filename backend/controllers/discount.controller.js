import { Demand, TaxDiscount, WaterTaxAssessment, ShopTaxAssessment, Property, User, Ward, AdminManagement, Shop } from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';
import { sequelize } from '../config/database.js';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';
import { generateDiscountApprovalPdfBuffer } from '../services/pdfGenerator.js';
import { getDemandOriginalAmount, calculateDiscount, calculateFinalAmount } from '../utils/financialCalculations.js';

/**
 * Indian FY: April 1 to March 31. Returns { start, end } for current FY.
 */
function getCurrentFYRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: Jan=0, Apr=3
  const start = month >= 3 ? new Date(year, 3, 1) : new Date(year - 1, 3, 1);
  const end = month >= 3 ? new Date(year + 1, 2, 31, 23, 59, 59, 999) : new Date(year, 2, 31, 23, 59, 59, 999);
  return { start, end };
}

const MODULE_SERVICE_MAP = {
  PROPERTY: 'HOUSE_TAX',
  WATER: 'WATER_TAX',
  SHOP: 'SHOP_TAX',
  D2DC: 'D2DC',
  UNIFIED: 'HOUSE_TAX' // Default to HOUSE_TAX, but will allow WATER_TAX if unified
};

/**
 * @route   POST /api/discounts
 * @desc    Apply discount to a demand (Admin only). Validates demand, computes discount, updates demand and inserts tax_discounts.
 * @access  Private (Admin)
 */
export const createDiscount = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { module_type, entity_id, demand_id, discount_type, discount_value, reason, document_url } = req.body;

    if (!module_type || entity_id == null || !demand_id || !discount_type || discount_value == null || !reason || !document_url) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'module_type, entity_id, demand_id, discount_type, discount_value, reason and document_url are required'
      });
    }

    const moduleType = String(module_type).toUpperCase();
    const entityId = parseInt(entity_id, 10);
    const demandId = parseInt(demand_id, 10);
    const discountType = String(discount_type).toUpperCase();
    const discountValue = parseFloat(discount_value);

    if (!['PROPERTY', 'WATER', 'SHOP', 'D2DC', 'UNIFIED'].includes(moduleType) || !['PERCENTAGE', 'FIXED'].includes(discountType)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid module_type or discount_type' });
    }
    if (isNaN(entityId) || isNaN(demandId) || isNaN(discountValue) || discountValue < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid entity_id, demand_id or discount_value' });
    }

    const demand = await Demand.findByPk(demandId, { transaction: t });
    if (!demand) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Demand not found' });
    }

    const serviceType = MODULE_SERVICE_MAP[moduleType];
    // For UNIFIED, we allow either HOUSE_TAX or WATER_TAX serviceType if it's a unified demand
    const isUnifiedDemand = demand.remarks && demand.remarks.includes('UNIFIED_DEMAND');

    if (moduleType === 'UNIFIED') {
      if (!isUnifiedDemand) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Selected demand is not a unified tax demand' });
      }
      // Unified demands can have HOUSE_TAX or WATER_TAX service types
      if (!['HOUSE_TAX', 'WATER_TAX'].includes(demand.serviceType)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Demand service type is incompatible with unified discount' });
      }
    } else {
      if (demand.serviceType !== serviceType) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Demand does not match selected tax module' });
      }
    }

    if (moduleType === 'PROPERTY' || moduleType === 'D2DC' || moduleType === 'UNIFIED') {
      if (demand.propertyId !== entityId) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Demand does not belong to selected entity' });
      }
    } else if (moduleType === 'WATER') {
      const wtIds = await WaterTaxAssessment.findAll({ where: { waterConnectionId: entityId }, attributes: ['id'], transaction: t });
      const ids = wtIds.map(a => a.id);
      if (!ids.length || !ids.includes(demand.waterTaxAssessmentId)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Demand does not belong to selected water connection' });
      }
    } else if (moduleType === 'SHOP') {
      const stIds = await ShopTaxAssessment.findAll({ where: { shopId: entityId }, attributes: ['id'], transaction: t });
      const ids = stIds.map(a => a.id);
      if (!ids.length || !ids.includes(demand.shopTaxAssessmentId)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Demand does not belong to selected shop' });
      }
    }

    const paidAmount = parseFloat(demand.paidAmount || 0);
    const balanceRemaining = parseFloat(demand.balanceAmount || 0);

    if (balanceRemaining <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Demand is already fully paid' });
    }

    const originalAmount = getDemandOriginalAmount(demand);
    if (originalAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Original amount is zero; discount cannot be applied' });
    }

    const existingActive = await TaxDiscount.findOne({
      where: { demandId, status: 'ACTIVE' },
      transaction: t
    });
    if (existingActive) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'An active adjustment already exists for this demand. Revoke it before applying a new one.' });
    }

    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Percentage must be between 0 and 100' });
    }

    const { discountAmount, error: discountError } = calculateDiscount(originalAmount, discountType, discountValue);
    if (discountError) {
      await t.rollback();
      return res.status(400).json({ success: false, message: discountError });
    }
    if (discountAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Discount amount must be greater than zero' });
    }

    const { finalAmount, remainingPenalty } = calculateFinalAmount(demand, {
      discountAmount,
      waiverAmount: parseFloat(demand.penaltyWaived || 0)
    });
    const newBalanceAmount = Math.max(0, Number((finalAmount - paidAmount).toFixed(2)));

    await demand.update({
      finalAmount,
      balanceAmount: newBalanceAmount
    }, { transaction: t });

    const approvedBy = req.user?.id ?? null;

    const discountRecord = await TaxDiscount.create({
      moduleType,
      entityId,
      demandId,
      discountType,
      discountValue: discountValue,
      discountAmount,
      reason: reason.trim(),
      documentUrl: document_url,
      approvedBy,
      status: 'ACTIVE'
    }, { transaction: t });

    const oldFinalAmount = demand.finalAmount != null ? parseFloat(demand.finalAmount) : (parseFloat(demand.totalAmount || 0));
    await auditLogger.createAuditLog({
      req,
      user: req.user,
      actionType: 'UPDATE',
      entityType: 'Demand',
      entityId: demandId,
      previousData: { totalAmount: demand.totalAmount, paidAmount: demand.paidAmount, balanceAmount: demand.balanceAmount, finalAmount: demand.finalAmount },
      newData: {
        discountAmount,
        finalAmount,
        balanceAmount: newBalanceAmount,
        discountId: discountRecord.id,
        oldFinalAmount,
        newFinalAmount: finalAmount,
        adjustmentType: 'DISCOUNT',
        appliedValue: discountAmount,
        appliedBy: req.user?.id ?? req.user?.staff_id ?? null
      },
      description: 'Discount applied'
    });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Discount applied successfully',
      data: {
        discount: {
          id: discountRecord.id,
          moduleType,
          entityId,
          demandId,
          discountType,
          discountValue,
          discountAmount,
          reason: discountRecord.reason,
          documentUrl: discountRecord.documentUrl,
          approvedBy: discountRecord.approvedBy,
          status: discountRecord.status,
          createdAt: discountRecord.created_at
        },
        demand: {
          id: demand.id,
          demandNumber: demand.demandNumber,
          totalAmount: demand.totalAmount,
          discountAmount,
          finalAmount,
          paidAmount: demand.paidAmount,
          balanceAmount: newBalanceAmount
        }
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * @route   GET /api/discounts/summary
 * @desc    Get discount summary (Admin only): counts and totals for ACTIVE discounts, current FY, this month.
 * @access  Private (Admin)
 */
export const getDiscountSummary = async (req, res, next) => {
  try {
    const { start: fyStart, end: fyEnd } = getCurrentFYRange();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeWhere = { status: 'ACTIVE' };

    const [totalDiscounts, totalAmountFY, activeDemands, monthlyCount, moduleBreakdown] = await Promise.all([
      TaxDiscount.count({ where: activeWhere }),
      TaxDiscount.sum('discountAmount', {
        where: {
          ...activeWhere,
          created_at: { [Op.gte]: fyStart, [Op.lte]: fyEnd }
        }
      }),
      TaxDiscount.count({
        where: activeWhere,
        distinct: true,
        col: 'demandId'
      }),
      TaxDiscount.count({
        where: {
          ...activeWhere,
          created_at: { [Op.gte]: monthStart }
        }
      }),
      TaxDiscount.findAll({
        where: activeWhere,
        attributes: ['moduleType', [fn('COUNT', col('id')), 'count']],
        group: ['moduleType'],
        raw: true
      })
    ]);

    const byModule = (moduleBreakdown || []).reduce((acc, row) => {
      acc[row.moduleType || row.module_type] = parseInt(row.count, 10) || 0;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        totalDiscounts: totalDiscounts || 0,
        totalDiscountAmountFY: parseFloat(totalAmountFY) || 0,
        activeDiscountedDemands: activeDemands || 0,
        monthlyDiscounts: monthlyCount || 0,
        byModule: {
          PROPERTY: byModule.PROPERTY ?? 0,
          WATER: byModule.WATER ?? 0,
          SHOP: byModule.SHOP ?? 0,
          D2DC: byModule.D2DC ?? 0,
          UNIFIED: byModule.UNIFIED ?? 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/discounts/history
 * @desc    Get discount history (Admin only): list of all discounts with demand info, newest first.
 * @access  Private (Admin)
 */
export const getDiscountHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const list = await TaxDiscount.findAll({
      include: [
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'totalAmount', 'finalAmount', 'balanceAmount'] }
      ],
      order: [['created_at', 'DESC']],
      limit
    });
    const history = (list || []).map((d) => ({
      id: d.id,
      moduleType: d.moduleType,
      entityId: d.entityId,
      demandId: d.demandId,
      demandNumber: d.demand?.demandNumber || null,
      discountType: d.discountType,
      discountValue: parseFloat(d.discountValue) || 0,
      discountAmount: parseFloat(d.discountAmount) || 0,
      reason: d.reason,
      documentUrl: d.documentUrl,
      approvedBy: d.approvedBy,
      status: d.status,
      createdAt: d.created_at
    }));
    return res.json({ success: true, data: { history } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/discounts/:id/pdf
 * @desc    Download discount approval letter PDF
 * @access  Private (Admin all; Collector ward; Citizen own only)
 */
export const getDiscountPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const discount = await TaxDiscount.findByPk(id, {
      include: [
        {
          model: Demand,
          as: 'demand',
          include: [
            { model: Property, as: 'property', required: false, include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }] },
            { model: WaterTaxAssessment, as: 'waterTaxAssessment', required: false, include: [{ model: Property, as: 'property', required: false, include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }] }] },
            { model: ShopTaxAssessment, as: 'shopTaxAssessment', required: false, include: [{ model: Shop, as: 'shop', attributes: ['shopNumber'] }] }
          ]
        }
      ]
    });

    if (!discount) {
      return res.status(404).json({ success: false, message: 'Discount not found' });
    }

    const demand = discount.demand;
    if (!demand) {
      return res.status(404).json({ success: false, message: 'Demand not found for this discount' });
    }

    const owner = demand.property?.owner || demand.waterTaxAssessment?.property?.owner || null;
    const ownerId = demand.property?.ownerId ?? demand.waterTaxAssessment?.property?.ownerId ?? null;

    if (req.user.role === 'citizen') {
      if (ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (req.user.role === 'collector' || req.user.role === 'tax_collector') {
      const collectorWards = await Ward.findAll({
        where: { collectorId: req.user.staff_id || req.user.id, isActive: true },
        attributes: ['id']
      });
      const wardIds = collectorWards.map(w => w.id);
      let demandWardId = demand.property?.wardId ?? demand.shopTaxAssessment?.shop?.wardId ?? demand.waterTaxAssessment?.property?.wardId ?? null;
      if (demandWardId != null && wardIds.length > 0) {
        const num = parseInt(demandWardId, 10);
        if (!wardIds.includes(num)) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }
    }

    let entityLabel = 'N/A';
    if (demand.serviceType === 'SHOP_TAX' && demand.shopTaxAssessment?.shop) {
      entityLabel = demand.shopTaxAssessment.shop.shopNumber || 'N/A';
    } else {
      entityLabel = demand.property?.propertyNumber || demand.waterTaxAssessment?.property?.propertyNumber || 'N/A';
    }

    let approvedByName = 'N/A';
    if (discount.approvedBy) {
      const approver = await User.findByPk(discount.approvedBy, { attributes: ['firstName', 'lastName'] });
      if (approver) approvedByName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim();
    }

    const buffer = await generateDiscountApprovalPdfBuffer(discount, {
      demand,
      owner,
      entityLabel,
      approvedByName
    });

    await createAuditLog({
      req,
      user: req.user,
      actionType: 'NOTICE_PDF_DOWNLOADED',
      entityType: 'Demand',
      entityId: demand.id,
      description: `Downloaded discount approval letter PDF for discount ${discount.id}`,
      metadata: { discountId: discount.id, demandId: demand.id }
    });

    const filename = `discount-approval-${discount.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
