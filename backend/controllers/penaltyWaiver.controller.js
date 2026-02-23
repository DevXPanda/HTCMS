import { Demand, PenaltyWaiver, TaxDiscount, WaterTaxAssessment, ShopTaxAssessment, Property, User, Shop, Ward } from '../models/index.js';
import { Op, fn, col } from 'sequelize';
import { sequelize } from '../config/database.js';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';
import { generatePenaltyWaiverLetterPdfBuffer } from '../services/pdfGenerator.js';
import { getDemandPenaltyAmount, calculatePenaltyWaiver, calculateFinalAmount } from '../utils/financialCalculations.js';

function getCurrentFYRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = month >= 3 ? new Date(year, 3, 1) : new Date(year - 1, 3, 1);
  const end = month >= 3 ? new Date(year + 1, 2, 31, 23, 59, 59, 999) : new Date(year, 2, 31, 23, 59, 59, 999);
  return { start, end };
}

const MODULE_SERVICE_MAP = {
  PROPERTY: 'HOUSE_TAX',
  WATER: 'WATER_TAX',
  SHOP: 'SHOP_TAX',
  D2DC: 'D2DC'
};

/**
 * @route   POST /api/penalty-waivers
 * @desc    Apply penalty waiver to a demand (Admin only). Validates demand, computes waiver, updates demand and inserts penalty_waivers.
 * @access  Private (Admin)
 */
export const createPenaltyWaiver = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { module_type, entity_id, demand_id, waiver_type, waiver_value, reason, document_url } = req.body;

    if (!module_type || entity_id == null || !demand_id || !waiver_type || waiver_value == null || !reason || !document_url) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'module_type, entity_id, demand_id, waiver_type, waiver_value, reason and document_url are required'
      });
    }

    const moduleType = String(module_type).toUpperCase();
    const entityId = parseInt(entity_id, 10);
    const demandId = parseInt(demand_id, 10);
    const waiverType = String(waiver_type).toUpperCase();
    const waiverValue = parseFloat(waiver_value);

    if (!['PROPERTY', 'WATER', 'SHOP', 'D2DC'].includes(moduleType) || !['PERCENTAGE', 'FIXED'].includes(waiverType)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid module_type or waiver_type' });
    }
    if (isNaN(entityId) || isNaN(demandId) || isNaN(waiverValue) || waiverValue < 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid entity_id, demand_id or waiver_value' });
    }

    const demand = await Demand.findByPk(demandId, { transaction: t });
    if (!demand) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Demand not found' });
    }

    const serviceType = MODULE_SERVICE_MAP[moduleType];
    if (demand.serviceType !== serviceType) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Demand does not match selected tax module' });
    }

    if (moduleType === 'PROPERTY' || moduleType === 'D2DC') {
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

    const penaltyAmountTotal = getDemandPenaltyAmount(demand);
    if (penaltyAmountTotal <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Demand has no penalty or interest to waive' });
    }

    const paidAmount = parseFloat(demand.paidAmount || 0);
    const totalAmount = parseFloat(demand.totalAmount || 0);
    if (paidAmount >= totalAmount) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Demand is already fully paid' });
    }

    const existingActive = await PenaltyWaiver.findOne({
      where: { demandId, status: 'ACTIVE' },
      transaction: t
    });
    if (existingActive) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'An active adjustment already exists for this demand. Revoke it before applying a new one.' });
    }

    if (waiverType === 'PERCENTAGE' && (waiverValue < 0 || waiverValue > 100)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Percentage must be between 0 and 100' });
    }

    const { waiverAmount, remainingPenalty, error: waiverError } = calculatePenaltyWaiver(penaltyAmountTotal, waiverType, waiverValue);
    if (waiverError) {
      await t.rollback();
      return res.status(400).json({ success: false, message: waiverError });
    }
    if (waiverAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Waiver amount must be greater than zero' });
    }

    const activeDiscount = await TaxDiscount.findOne({
      where: { demandId, status: 'ACTIVE' },
      attributes: ['discountAmount'],
      transaction: t
    });
    const discountAmountForFinal = activeDiscount ? parseFloat(activeDiscount.discountAmount || 0) : 0;
    const { finalAmount } = calculateFinalAmount(demand, {
      discountAmount: discountAmountForFinal,
      waiverAmount
    });
    const newBalanceAmount = Math.max(0, Number((finalAmount - paidAmount).toFixed(2)));

    await demand.update({
      penaltyWaived: waiverAmount,
      finalAmount,
      balanceAmount: newBalanceAmount
    }, { transaction: t });

    const approvedBy = req.user?.id ?? req.user?.staff_id ?? null;

    const waiverRecord = await PenaltyWaiver.create({
      moduleType,
      entityId,
      demandId,
      waiverType,
      waiverValue,
      waiverAmount,
      reason: reason.trim(),
      documentUrl: document_url,
      approvedBy,
      status: 'ACTIVE'
    }, { transaction: t });

    const oldFinalAmount = demand.finalAmount != null ? parseFloat(demand.finalAmount) : parseFloat(demand.totalAmount || 0);
    await auditLogger.createAuditLog({
      req,
      user: req.user,
      actionType: 'UPDATE',
      entityType: 'Demand',
      entityId: demandId,
      previousData: { penaltyWaived: demand.penaltyWaived, finalAmount: demand.finalAmount, balanceAmount: demand.balanceAmount },
      newData: {
        penaltyWaived: waiverAmount,
        finalAmount,
        balanceAmount: newBalanceAmount,
        penaltyWaiverId: waiverRecord.id,
        oldFinalAmount,
        newFinalAmount: finalAmount,
        adjustmentType: 'PENALTY',
        appliedValue: waiverAmount,
        appliedBy: req.user?.id ?? req.user?.staff_id ?? null
      },
      description: 'Penalty waiver applied'
    });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: 'Penalty waiver applied successfully',
      data: {
        waiver: {
          id: waiverRecord.id,
          moduleType,
          entityId,
          demandId,
          waiverType,
          waiverValue,
          waiverAmount,
          reason: waiverRecord.reason,
          documentUrl: waiverRecord.documentUrl,
          approvedBy: waiverRecord.approvedBy,
          status: waiverRecord.status,
          createdAt: waiverRecord.createdAt
        },
        demand: {
          id: demand.id,
          demandNumber: demand.demandNumber,
          totalAmount: demand.totalAmount,
          penaltyWaived: waiverAmount,
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
 * @route   GET /api/penalty-waivers/summary
 * @desc    Get penalty waiver summary (Admin only): counts and totals for ACTIVE waivers, current FY, this month.
 * @access  Private (Admin)
 */
export const getPenaltyWaiverSummary = async (req, res, next) => {
  try {
    const { start: fyStart, end: fyEnd } = getCurrentFYRange();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const activeWhere = { status: 'ACTIVE' };

    const [totalWaivers, totalAmountFY, activeDemands, monthlyCount, moduleBreakdown] = await Promise.all([
      PenaltyWaiver.count({ where: activeWhere }),
      PenaltyWaiver.sum('waiverAmount', {
        where: { ...activeWhere, created_at: { [Op.gte]: fyStart, [Op.lte]: fyEnd } }
      }),
      PenaltyWaiver.count({
        where: activeWhere,
        distinct: true,
        col: 'demandId'
      }),
      PenaltyWaiver.count({
        where: { ...activeWhere, created_at: { [Op.gte]: monthStart } }
      }),
      PenaltyWaiver.findAll({
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
        totalWaivers: totalWaivers || 0,
        totalWaiverAmountFY: parseFloat(totalAmountFY) || 0,
        activeWaivedDemands: activeDemands || 0,
        monthlyWaivers: monthlyCount || 0,
        byModule: {
          PROPERTY: byModule.PROPERTY ?? 0,
          WATER: byModule.WATER ?? 0,
          SHOP: byModule.SHOP ?? 0,
          D2DC: byModule.D2DC ?? 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/penalty-waivers/history
 * @desc    Get penalty waiver history (Admin only): list of all waivers with demand info, newest first.
 * @access  Private (Admin)
 */
export const getPenaltyWaiverHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const list = await PenaltyWaiver.findAll({
      include: [
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'penaltyAmount', 'interestAmount', 'penaltyWaived', 'finalAmount'] }
      ],
      order: [['created_at', 'DESC']],
      limit
    });
    const history = (list || []).map((w) => ({
      id: w.id,
      moduleType: w.moduleType,
      entityId: w.entityId,
      demandId: w.demandId,
      demandNumber: w.demand?.demandNumber || null,
      waiverType: w.waiverType,
      waiverValue: parseFloat(w.waiverValue) || 0,
      waiverAmount: parseFloat(w.waiverAmount) || 0,
      reason: w.reason,
      documentUrl: w.documentUrl,
      approvedBy: w.approvedBy,
      status: w.status,
      createdAt: w.created_at
    }));
    return res.json({ success: true, data: { history } });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/penalty-waivers/:id/pdf
 * @desc    Download penalty waiver letter PDF
 * @access  Private (Admin; Collector view only; Citizen own only)
 */
export const getPenaltyWaiverPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const waiver = await PenaltyWaiver.findByPk(id, {
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

    if (!waiver) {
      return res.status(404).json({ success: false, message: 'Penalty waiver not found' });
    }

    const demand = waiver.demand;
    if (!demand) {
      return res.status(404).json({ success: false, message: 'Demand not found for this waiver' });
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
      const demandWardId = demand.property?.wardId ?? demand.shopTaxAssessment?.shop?.wardId ?? demand.waterTaxAssessment?.property?.wardId ?? null;
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
    if (waiver.approvedBy) {
      const approver = await User.findByPk(waiver.approvedBy, { attributes: ['firstName', 'lastName'] });
      if (approver) approvedByName = `${approver.firstName || ''} ${approver.lastName || ''}`.trim();
    }

    const buffer = await generatePenaltyWaiverLetterPdfBuffer(waiver, {
      demand,
      owner,
      entityLabel,
      approvedByName
    });

    await createAuditLog({
      req,
      user: req.user,
      actionType: 'NOTICE_PDF_DOWNLOADED',
      entityType: 'PenaltyWaiver',
      entityId: waiver.id,
      description: `Downloaded penalty waiver letter PDF for waiver ${waiver.id}`,
      metadata: { waiverId: waiver.id, demandId: demand.id }
    });

    const filename = `penalty-waiver-${waiver.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
