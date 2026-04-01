import { Op } from 'sequelize';
import { PaymentApprovalRequest, Demand, TaxDiscount, PenaltyWaiver, Property, Ward, AdminManagement, User, CollectorTask, WaterTaxAssessment, ShopTaxAssessment } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { getEffectiveUlbForRequest, getWardIdsByUlbId } from '../utils/ulbAccessHelper.js';
import { pushNotification } from '../services/notificationService.js';
import { getDemandOriginalAmount, calculateDiscount, getDemandPenaltyAmount, calculatePenaltyWaiver, calculateFinalAmount } from '../utils/financialCalculations.js';
import { sendRoleBasedEmail } from '../services/emailService.js';
import { EMAIL_EVENTS } from '../config/emailEvents.js';

const normalizeRole = (role) => (role || '').toString().toUpperCase().replace(/-/g, '_');

const buildRequestPayload = (body) => {
  const {
    request_type,
    module_type,
    entity_id,
    demand_id,
    adjustment_type,
    adjustment_value,
    reason,
    document_url,
    metadata
  } = body;

  return {
    requestType: String(request_type || '').toUpperCase(),
    moduleType: String(module_type || '').toUpperCase(),
    entityId: parseInt(entity_id, 10),
    demandId: parseInt(demand_id, 10),
    adjustmentType: String(adjustment_type || '').toUpperCase(),
    adjustmentValue: parseFloat(adjustment_value),
    reason: (reason || '').trim(),
    documentUrl: document_url || null,
    metadata: metadata || null
  };
};

const validateRequestPayload = (payload) => {
  const errors = [];
  if (!['DISCOUNT', 'PENALTY_WAIVER'].includes(payload.requestType)) errors.push('Invalid request_type');
  if (!['PROPERTY', 'WATER', 'SHOP', 'D2DC', 'UNIFIED'].includes(payload.moduleType)) errors.push('Invalid module_type');
  if (!['PERCENTAGE', 'FIXED'].includes(payload.adjustmentType)) errors.push('Invalid adjustment_type');
  if (!Number.isInteger(payload.entityId) || payload.entityId <= 0) errors.push('Invalid entity_id');
  if (!Number.isInteger(payload.demandId) || payload.demandId <= 0) errors.push('Invalid demand_id');
  if (Number.isNaN(payload.adjustmentValue) || payload.adjustmentValue <= 0) errors.push('Invalid adjustment_value');
  if (!payload.reason) errors.push('Reason is required');
  return errors;
};

const getCollectorForDemand = async (demandId) => {
  const demand = await Demand.findByPk(demandId, {
    include: [{ model: Property, as: 'property', include: [{ model: Ward, as: 'ward' }] }]
  });
  const wardId = demand?.property?.wardId;
  if (!wardId) return null;
  const ward = demand.property?.ward || await Ward.findByPk(wardId, { attributes: ['id', 'collectorId'] });
  if (!ward?.collectorId) return null;
  return await AdminManagement.findByPk(ward.collectorId);
};

export const createApprovalRequest = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.role);
    if (!(req.userType === 'admin_management' && role === 'ACCOUNT_OFFICER')) {
      return res.status(403).json({ success: false, message: 'Only Account Officer can create approval requests.' });
    }

    const payload = buildRequestPayload(req.body);
    const validationErrors = validateRequestPayload(payload);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join(', ') });
    }

    const demand = await Demand.findByPk(payload.demandId, {
      include: [{ model: Property, as: 'property', include: [{ model: Ward, as: 'ward', attributes: ['id', 'ulb_id'] }] }]
    });
    if (!demand) return res.status(404).json({ success: false, message: 'Demand not found' });

    const wardUlbId = demand.property?.ward?.ulb_id || null;
    const userUlb = req.user?.ulb_id || req.user?.dataValues?.ulb_id || null;
    if (userUlb && wardUlbId && String(userUlb) !== String(wardUlbId)) {
      return res.status(403).json({ success: false, message: 'Demand does not belong to your ULB.' });
    }

    const existingPending = await PaymentApprovalRequest.findOne({
      where: {
        demandId: payload.demandId,
        requestType: payload.requestType,
        status: 'PENDING'
      }
    });
    if (existingPending) {
      return res.status(400).json({ success: false, message: 'A pending request already exists for this demand and action.' });
    }

    const approvalRequest = await PaymentApprovalRequest.create({
      ...payload,
      requestedBy: req.user.id,
      requestedByName: req.user.full_name || null,
      status: 'PENDING'
    });

    try {
      await createAuditLog({ req, user: req.user, actionType: 'CREATE', entityType: 'PaymentApprovalRequest', entityId: approvalRequest.id, description: `Created ${payload.requestType} approval request`, metadata: { demandId: payload.demandId, moduleType: payload.moduleType, adjustmentType: payload.adjustmentType, adjustmentValue: payload.adjustmentValue } });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: 'Approval request submitted to Super Admin',
      data: { request: approvalRequest }
    });
  } catch (error) {
    next(error);
  }
};

export const listApprovalRequests = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.role);
    const { status, requestType, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = String(status).toUpperCase();
    if (requestType) where.requestType = String(requestType).toUpperCase();

    const { isSuperAdmin, effectiveUlbId } = getEffectiveUlbForRequest(req);
    const isAccountOfficer = req.userType === 'admin_management' && role === 'ACCOUNT_OFFICER';
    if (isAccountOfficer) {
      where.requestedBy = req.user.id;
    } else if (!isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Admin or Account Officer can view approval requests.' });
    }

    // Super admin can optionally filter by ULB
    const include = [
      { model: AdminManagement, as: 'requester', attributes: ['id', 'full_name', 'employee_id', 'ulb_id'] },
      {
        model: Demand,
        as: 'demand',
        attributes: ['id', 'demandNumber', 'balanceAmount', 'serviceType'],
        include: [{ model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'wardId'], include: [{ model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'ulb_id'] }] }]
      }
    ];

    if (isSuperAdmin && effectiveUlbId) {
      const wardIds = await getWardIdsByUlbId(effectiveUlbId);
      if (!wardIds.length) {
        return res.json({ success: true, data: { requests: [], pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 } } });
      }
      where['$demand.property.wardId$'] = { [Op.in]: wardIds };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await PaymentApprovalRequest.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        requests: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getApprovalRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = normalizeRole(req.user?.role);
    const approvalRequest = await PaymentApprovalRequest.findByPk(id, {
      include: [
        { model: AdminManagement, as: 'requester', attributes: ['id', 'full_name', 'employee_id', 'ulb_id'] },
        {
          model: Demand,
          as: 'demand',
          include: [{ model: Property, as: 'property', include: [{ model: Ward, as: 'ward', attributes: ['id', 'ulb_id', 'collectorId', 'wardNumber'] }] }]
        }
      ]
    });
    if (!approvalRequest) return res.status(404).json({ success: false, message: 'Approval request not found' });

    const { isSuperAdmin } = getEffectiveUlbForRequest(req);
    const isAccountOfficer = req.userType === 'admin_management' && role === 'ACCOUNT_OFFICER';
    if (!isSuperAdmin && !(isAccountOfficer && approvalRequest.requestedBy === req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { request: approvalRequest } });
  } catch (error) {
    next(error);
  }
};

export const approveRequest = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { isSuperAdmin } = getEffectiveUlbForRequest(req);
    if (!isSuperAdmin) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Only Super Admin can approve requests.' });
    }

    const { id } = req.params;
    const approvalRequest = await PaymentApprovalRequest.findByPk(id, {
      include: [{ model: Demand, as: 'demand', include: [{ model: Property, as: 'property', include: [{ model: Ward, as: 'ward' }] }] }],
      transaction: t
    });
    if (!approvalRequest) { await t.rollback(); return res.status(404).json({ success: false, message: 'Approval request not found' }); }
    if (approvalRequest.status !== 'PENDING') { await t.rollback(); return res.status(400).json({ success: false, message: `Request is already ${approvalRequest.status}` }); }

    const demand = approvalRequest.demand;
    if (!demand) { await t.rollback(); return res.status(404).json({ success: false, message: 'Linked demand not found' }); }

    const MODULE_SERVICE_MAP = { PROPERTY: 'HOUSE_TAX', WATER: 'WATER_TAX', SHOP: 'SHOP_TAX', D2DC: 'D2DC', UNIFIED: 'HOUSE_TAX' };
    const moduleType = approvalRequest.moduleType;
    const moduleTypeForDb = moduleType === 'UNIFIED'
      ? (demand.serviceType === 'WATER_TAX' ? 'WATER' : 'PROPERTY')
      : moduleType;

    let adjustmentRecord = null;

    if (approvalRequest.requestType === 'DISCOUNT') {
      const originalAmount = getDemandOriginalAmount(demand);
      const balanceRemaining = parseFloat(demand.balanceAmount || 0);
      const paidAmount = parseFloat(demand.paidAmount || 0);
      const { discountAmount, error: discErr } = calculateDiscount(originalAmount, approvalRequest.adjustmentType, parseFloat(approvalRequest.adjustmentValue));
      if (discErr || discountAmount <= 0 || discountAmount > balanceRemaining) {
        await t.rollback();
        return res.status(400).json({ success: false, message: discErr || 'Discount exceeds remaining balance' });
      }
      const { finalAmount } = calculateFinalAmount(demand, { discountAmount, waiverAmount: parseFloat(demand.penaltyWaived || 0) });
      const newBalance = Math.max(0, Number((finalAmount - paidAmount).toFixed(2)));
      await demand.update({ finalAmount, balanceAmount: newBalance }, { transaction: t });
      adjustmentRecord = await TaxDiscount.create({
        moduleType: moduleTypeForDb,
        entityId: approvalRequest.entityId,
        demandId: demand.id,
        discountType: approvalRequest.adjustmentType,
        discountValue: parseFloat(approvalRequest.adjustmentValue),
        discountAmount,
        reason: approvalRequest.reason,
        documentUrl: approvalRequest.documentUrl,
        approvedBy: req.user.id,
        status: 'ACTIVE'
      }, { transaction: t });
    } else {
      const penaltyTotal = getDemandPenaltyAmount(demand);
      const paidAmount = parseFloat(demand.paidAmount || 0);
      const { waiverAmount, error: wErr } = calculatePenaltyWaiver(penaltyTotal, approvalRequest.adjustmentType, parseFloat(approvalRequest.adjustmentValue));
      if (wErr || waiverAmount <= 0) {
        await t.rollback();
        return res.status(400).json({ success: false, message: wErr || 'Waiver amount invalid' });
      }
      const prevWaived = parseFloat(demand.penaltyWaived || 0);
      const newPenaltyWaived = Number((prevWaived + waiverAmount).toFixed(2));
      const existingDiscountAmount = parseFloat(demand.totalAmount || 0) - parseFloat(demand.finalAmount || demand.totalAmount || 0) - prevWaived;
      const { finalAmount } = calculateFinalAmount(demand, { discountAmount: Math.max(0, existingDiscountAmount), waiverAmount: newPenaltyWaived });
      const newBalance = Math.max(0, Number((finalAmount - paidAmount).toFixed(2)));
      await demand.update({ penaltyWaived: newPenaltyWaived, finalAmount, balanceAmount: newBalance }, { transaction: t });
      adjustmentRecord = await PenaltyWaiver.create({
        moduleType: moduleTypeForDb,
        entityId: approvalRequest.entityId,
        demandId: demand.id,
        waiverType: approvalRequest.adjustmentType,
        waiverValue: parseFloat(approvalRequest.adjustmentValue),
        waiverAmount,
        reason: approvalRequest.reason,
        documentUrl: approvalRequest.documentUrl,
        approvedBy: req.user.id,
        status: 'ACTIVE'
      }, { transaction: t });
    }

    const collector = await getCollectorForDemand(approvalRequest.demandId);
    let collectorTask = null;
    if (collector && demand.property?.ownerId) {
      const taskDate = new Date().toISOString().split('T')[0];
      const dateFmt = taskDate.replace(/-/g, '');
      const existingCount = await CollectorTask.count({ where: { collectorId: collector.id, taskDate } });
      const taskNumber = `TASK-${dateFmt}-${collector.id}-${String(existingCount + 1).padStart(3, '0')}`;
      collectorTask = await CollectorTask.create({
        taskNumber,
        collectorId: collector.id,
        demandId: approvalRequest.demandId,
        propertyId: demand.propertyId,
        ownerId: demand.property.ownerId,
        taskDate,
        taskType: 'due_today',
        priority: 'high',
        actionRequired: `${approvalRequest.requestType === 'DISCOUNT' ? 'Discount' : 'Penalty waiver'} approved & applied by Super Admin for demand ${demand.demandNumber || demand.id}. Notify citizen.`,
        citizenName: demand.property?.owner?.fullName || 'Citizen',
        propertyNumber: demand.property?.propertyNumber || 'N/A',
        wardNumber: demand.property?.ward?.wardNumber || null,
        dueAmount: parseFloat(demand.balanceAmount || 0),
        overdueDays: 0,
        generatedBy: 'admin',
        generationReason: `Approval request #${approvalRequest.id} approved`
      }, { transaction: t });

      try {
        await pushNotification({ userId: collector.id, userType: 'admin_management', role: 'collector', title: 'Approved payment adjustment', message: `Request #${approvalRequest.id} approved & applied. Demand: ${demand.demandNumber || demand.id}.`, link: `/collector/tasks` });
      } catch (_) {}
    }

    await approvalRequest.update({
      status: 'APPROVED',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      forwardedCollectorId: collector?.id || null,
      metadata: { ...(approvalRequest.metadata || {}), collectorTaskId: collectorTask?.id || null, adjustmentRecordId: adjustmentRecord?.id || null }
    }, { transaction: t });

    await t.commit();

    try {
      await createAuditLog({ req, user: req.user, actionType: 'APPROVE', entityType: 'Demand', entityId: demand.id, description: `Super Admin approved ${approvalRequest.requestType} request #${approvalRequest.id} and applied to demand`, metadata: { approvalRequestId: approvalRequest.id, collectorId: collector?.id || null } });
    } catch (_) {}

    try {
      await sendRoleBasedEmail(EMAIL_EVENTS.PAYMENT_APPROVED, { paymentId: approvalRequest.id, amount: approvalRequest.adjustmentValue });
    } catch (e) {
      console.error('Error dispatching PAYMENT_APPROVED email:', e);
    }

    res.json({
      success: true,
      message: collector ? 'Request approved, adjustment applied, and forwarded to collector.' : 'Request approved and adjustment applied.',
      data: { request: approvalRequest }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

export const rejectRequest = async (req, res, next) => {
  try {
    const { isSuperAdmin } = getEffectiveUlbForRequest(req);
    if (!isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Only Super Admin can reject requests.' });
    }
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const approvalRequest = await PaymentApprovalRequest.findByPk(id);
    if (!approvalRequest) return res.status(404).json({ success: false, message: 'Approval request not found' });
    if (approvalRequest.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request is already ${approvalRequest.status}` });
    }

    await approvalRequest.update({
      status: 'REJECTED',
      approvedBy: req.user.id,
      approvedAt: new Date(),
      rejectionReason: (rejection_reason || '').trim() || 'Rejected by Super Admin'
    });

    try {
      await createAuditLog({ req, user: req.user, actionType: 'REJECT', entityType: 'PaymentApprovalRequest', entityId: approvalRequest.id, description: `Rejected request #${approvalRequest.id}`, metadata: { rejectionReason: approvalRequest.rejectionReason } });
    } catch (_) {}

    res.json({ success: true, message: 'Request rejected', data: { request: approvalRequest } });
  } catch (error) {
    next(error);
  }
};
