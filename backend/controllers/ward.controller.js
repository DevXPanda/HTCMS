import { Ward, User, Property, Demand, DemandItem, Payment, TaxDiscount, PenaltyWaiver, Shop, WaterTaxAssessment, ShopTaxAssessment, ULB } from '../models/index.js';
import { AdminManagement } from '../models/AdminManagement.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';
import { calculateFinalAmount } from '../utils/financialCalculations.js';
import { wardAccessControl, specificWardAccess } from '../middleware/wardAccess.js';
import { getEffectiveUlbForRequest } from '../utils/ulbAccessHelper.js';

/** Normalize ward number to 3-digit zero-padded format (e.g. 1 -> 001). Non-numeric values returned as-is. */
function normalizeWardNumber(val) {
  if (val == null || val === '') return val;
  const s = String(val).trim();
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 0) return String(n).padStart(3, '0');
  return s;
}

/**
 * @route   GET /api/wards
 * @desc    Get all wards
 * @access  Private
 */
export const getAllWards = async (req, res, next) => {
  try {
    const { isActive, search, ids } = req.query;

    const where = {};

    // Apply ward access control filter for non-admin users
    if (req.wardFilter) {
      Object.assign(where, req.wardFilter);
    }

    const { isSuperAdmin, effectiveUlbId } = getEffectiveUlbForRequest(req);
    if (!isSuperAdmin && (effectiveUlbId == null || effectiveUlbId === '')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be assigned to an ULB to view wards.'
      });
    }
    if (effectiveUlbId) {
      const wardsWithUlb = await Ward.count({ where: { ulb_id: effectiveUlbId } });
      if (wardsWithUlb > 0) {
        where.ulb_id = effectiveUlbId;
      } else {
        where.ulb_id = { [Op.is]: null };
      }
    }

    // Support filtering by specific IDs (for inspector dashboard)
    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (idArray.length > 0) {
        where.id = { [Op.in]: idArray };
      }
    }

    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where[Op.or] = [
        { wardNumber: { [Op.iLike]: `%${search}%` } },
        { wardName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const wards = await Ward.findAll({
      where,
      include: [
        {
          model: AdminManagement,
          as: 'collector',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        },
        {
          model: ULB,
          as: 'ulb',
          attributes: ['id', 'name', 'state', 'district'],
          required: false
        }
      ],
      order: [['wardNumber', 'ASC']]
    });

    res.json({
      success: true,
      data: { wards }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/wards/:id
 * @desc    Get ward by ID
 * @access  Private
 */
export const getWardById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ward = await Ward.findByPk(id, {
      include: [
        {
          model: AdminManagement,
          as: 'collector',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        },
        {
          model: AdminManagement,
          as: 'clerk',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        },
        {
          model: AdminManagement,
          as: 'inspector',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        },
        {
          model: AdminManagement,
          as: 'officer',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        },
        {
          model: ULB,
          as: 'ulb',
          attributes: ['id', 'name', 'state', 'district']
        },
        {
          model: Property,
          as: 'properties',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        }
      ]
    });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // ULB isolation: non–super-admin can only view wards in their assigned ULB
    const { isSuperAdmin, effectiveUlbId } = getEffectiveUlbForRequest(req);
    if (!isSuperAdmin && effectiveUlbId && ward.ulb_id !== effectiveUlbId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Ward does not belong to your assigned ULB.'
      });
    }

    res.json({
      success: true,
      data: { ward }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/wards
 * @desc    Create new ward
 * @access  Private (Admin only)
 */
export const createWard = async (req, res, next) => {
  try {
    const { wardNumber, wardName, description, collectorId, ulb_id } = req.body;

    // Validate ULB is provided
    if (!ulb_id) {
      return res.status(400).json({
        success: false,
        message: 'ULB is required'
      });
    }

    // Validate ULB exists
    const ulb = await ULB.findByPk(ulb_id);
    if (!ulb) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ULB ID'
      });
    }

    const normalizedNumber = normalizeWardNumber(wardNumber);
    if (!normalizedNumber) {
      return res.status(400).json({
        success: false,
        message: 'Ward number is required'
      });
    }

    // Check duplicate by (ulb_id, ward_number) - allow same ward number in different ULBs
    const existingWard = await Ward.findOne({
      where: { ulb_id, wardNumber: normalizedNumber }
    });

    if (existingWard) {
      return res.status(400).json({
        success: false,
        message: 'Ward with this number already exists in this ULB'
      });
    }

    // Validate collector if provided: must exist, be COLLECTOR, and belong to same ULB as ward
    if (collectorId) {
      const collector = await AdminManagement.findByPk(collectorId, { attributes: ['id', 'role', 'ulb_id'] });
      const collectorRole = (collector?.role || '').toString().toUpperCase();
      if (!collector || collectorRole !== 'COLLECTOR') {
        return res.status(400).json({
          success: false,
          message: 'Invalid collector. Staff member must have collector role.'
        });
      }
      if (collector.ulb_id && collector.ulb_id !== ulb_id) {
        return res.status(400).json({
          success: false,
          message: 'Collector must be assigned to the same ULB as the ward.'
        });
      }
    }

    const ward = await Ward.create({
      wardNumber: normalizedNumber,
      wardName,
      description,
      collectorId,
      ulb_id
    });

    const createdWard = await Ward.findByPk(ward.id, {
      include: [
        {
          model: AdminManagement,
          as: 'collector',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        },
        {
          model: ULB,
          as: 'ulb',
          attributes: ['id', 'name', 'state', 'district']
        }
      ]
    });

    // Log ward creation
    await auditLogger.logCreate(
      req,
      req.user,
      'Ward',
      ward.id,
      { wardNumber: ward.wardNumber, wardName: ward.wardName, collectorId: ward.collectorId, ulb_id: ward.ulb_id },
      `Created ward: ${ward.wardNumber} - ${ward.wardName}`
    );

    res.status(201).json({
      success: true,
      message: 'Ward created successfully',
      data: { ward: createdWard }
    });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      const constraint = (error.parent && error.parent.constraint) || error.constraint || '';
      if (String(constraint).includes('collector')) {
        return res.status(400).json({
          success: false,
          message: 'The selected collector could not be assigned. Run the fix script: node backend/scripts/fix-ward-collector-fk.js (from project root with .env loaded).'
        });
      }
    }
    next(error);
  }
};

/**
 * @route   PUT /api/wards/:id
 * @desc    Update ward
 * @access  Private (Admin only)
 */
export const updateWard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { wardNumber: bodyWardNumber, wardName, description, collectorId, ulb_id } = req.body;

    const ward = await Ward.findByPk(id);
    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // Validate ULB if provided
    if (ulb_id) {
      const ulb = await ULB.findByPk(ulb_id);
      if (!ulb) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ULB ID'
        });
      }
    }

    if (bodyWardNumber !== undefined && bodyWardNumber !== null && String(bodyWardNumber).trim() !== '') {
      const normalizedNumber = normalizeWardNumber(bodyWardNumber);
      const ulbIdForUnique = ulb_id !== undefined ? ulb_id : ward.ulb_id;
      const existing = await Ward.findOne({
        where: { ulb_id: ulbIdForUnique, wardNumber: normalizedNumber, id: { [Op.ne]: id } }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Ward with this number already exists in this ULB'
        });
      }
      ward.wardNumber = normalizedNumber;
    }

    // Capture previous data for audit log
    const previousData = {
      wardNumber: ward.wardNumber,
      wardName: ward.wardName,
      collectorId: ward.collectorId,
      ulb_id: ward.ulb_id
    };

    // Validate collector if provided: must be COLLECTOR and same ULB as ward
    if (collectorId) {
      const collector = await AdminManagement.findByPk(collectorId, { attributes: ['id', 'role', 'ulb_id'] });
      const collectorRole = (collector?.role || '').toString().toUpperCase();
      if (!collector || collectorRole !== 'COLLECTOR') {
        return res.status(400).json({
          success: false,
          message: 'Invalid collector. Staff member must have collector role.'
        });
      }
      const wardUlbId = ulb_id !== undefined ? ulb_id : ward.ulb_id;
      if (collector.ulb_id && wardUlbId && collector.ulb_id !== wardUlbId) {
        return res.status(400).json({
          success: false,
          message: 'Collector must be assigned to the same ULB as the ward.'
        });
      }
    }

    const isCollectorAssignment = collectorId !== undefined && collectorId !== ward.collectorId;

    if (wardName) ward.wardName = wardName;
    if (description !== undefined) ward.description = description;
    if (collectorId !== undefined) {
      ward.collectorId = collectorId;
    }
    if (ulb_id !== undefined) {
      ward.ulb_id = ulb_id;
    }

    await ward.save();

    // Log based on what changed
    const newData = {
      wardNumber: ward.wardNumber,
      wardName: ward.wardName,
      collectorId: ward.collectorId,
      ulb_id: ward.ulb_id
    };

    if (isCollectorAssignment) {
      // Log collector assignment
      await auditLogger.logAssign(
        req,
        req.user,
        'Ward',
        ward.id,
        newData,
        `Assigned collector to ward: ${ward.wardNumber}`,
        { previousCollectorId: previousData.collectorId, newCollectorId: collectorId }
      );
    } else {
      // Log regular update
      await auditLogger.logUpdate(
        req,
        req.user,
        'Ward',
        ward.id,
        previousData,
        newData,
        `Updated ward: ${ward.wardNumber}`
      );
    }

    const updatedWard = await Ward.findByPk(id, {
      include: [
        {
          model: AdminManagement,
          as: 'collector',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Ward updated successfully',
      data: { ward: updatedWard }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/wards/:id/assign-collector
 * @desc    Assign tax collector to ward
 * @access  Private (Admin only)
 */
export const assignCollector = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { collectorId } = req.body;

    const ward = await Ward.findByPk(id);
    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // Allow null/empty to unassign collector
    if (!collectorId) {
      const previousCollectorId = ward.collectorId;
      ward.collectorId = null;
      await ward.save();
      // Sync Staff Management: clear previous collector's ward_id/ward_ids so list shows "No wards assigned"
      if (previousCollectorId) {
        await AdminManagement.update(
          { ward_id: null, ward_ids: [] },
          { where: { id: previousCollectorId, role: 'COLLECTOR' } }
        );
      }
      const updatedWard = await Ward.findByPk(id, {
        include: [
          { model: AdminManagement, as: 'collector', attributes: ['id', 'full_name', 'email', 'phone_number'] }
        ]
      });
      return res.json({
        success: true,
        message: 'Collector unassigned successfully',
        data: { ward: updatedWard }
      });
    }

    const collector = await AdminManagement.findByPk(collectorId, { attributes: ['id', 'role', 'ulb_id'] });
    const collectorRole = (collector?.role || '').toString().toUpperCase();
    if (!collector || collectorRole !== 'COLLECTOR') {
      return res.status(400).json({
        success: false,
        message: 'Invalid collector. Staff member must have collector role.'
      });
    }
    if (collector.ulb_id && ward.ulb_id && collector.ulb_id !== ward.ulb_id) {
      return res.status(400).json({
        success: false,
        message: 'Collector must be assigned to the same ULB as the ward.'
      });
    }

    const previousCollectorId = ward.collectorId;
    ward.collectorId = collectorId;
    await ward.save();

    // Sync Staff Management: update collector's ward_id/ward_ids so list shows the assigned ward
    await AdminManagement.update(
      { ward_id: parseInt(id), ward_ids: [parseInt(id)] },
      { where: { id: collectorId } }
    );
    // Clear previous collector's assignment for this ward so their list entry updates
    if (previousCollectorId) {
      await AdminManagement.update(
        { ward_id: null, ward_ids: [] },
        { where: { id: previousCollectorId, role: 'COLLECTOR' } }
      );
    }

    // Log collector assignment
    await auditLogger.logAssign(
      req,
      req.user,
      'Ward',
      ward.id,
      { collectorId },
      `Assigned collector to ward: ${ward.wardNumber}`,
      { previousCollectorId, newCollectorId: collectorId }
    );

    const updatedWard = await Ward.findByPk(id, {
      include: [
        {
          model: AdminManagement,
          as: 'collector',
          attributes: ['id', 'full_name', 'email', 'phone_number']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Collector assigned successfully',
      data: { ward: updatedWard }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/wards/:id
 * @desc    Delete ward (soft delete)
 * @access  Private (Admin only)
 */
export const deleteWard = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ward = await Ward.findByPk(id);
    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // Soft delete
    ward.isActive = false;
    await ward.save();

    res.json({
      success: true,
      message: 'Ward deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/wards/:id/statistics
 * @desc    Get ward statistics (properties, demands, collection)
 * @access  Private
 */
export const getWardStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ward = await Ward.findByPk(id);
    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // Get properties in this ward
    const properties = await Property.findAll({
      where: { wardId: id },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

    // Get demands
    const demands = await Demand.findAll({
      where: { propertyId: { [Op.in]: propertyIds } }
    });

    // Get payments
    const payments = await Payment.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        status: 'completed'
      },
      order: [['paymentDate', 'DESC']],
      limit: 10
    });

    const statistics = {
      totalProperties: properties.length,
      totalDemands: demands.length,
      totalCollection: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
      totalOutstanding: demands
        .filter(d => parseFloat(d.balanceAmount || 0) > 0)
        .reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      pendingDemands: demands.filter(d => d.status === 'pending').length,
      overdueDemands: demands.filter(d => {
        const today = new Date();
        const dueDate = new Date(d.dueDate);
        return today > dueDate && parseFloat(d.balanceAmount || 0) > 0;
      }).length,
      paidDemands: demands.filter(d => d.status === 'paid').length
    };

    res.json({
      success: true,
      data: { statistics }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/wards/collector/:collectorId
 * @desc    Get all wards assigned to a collector (with property and pending demand counts)
 * @access  Private
 */
export const getWardsByCollector = async (req, res, next) => {
  try {
    const { collectorId } = req.params;
    const effectiveCollectorId = parseInt(collectorId, 10);

    // If no wards by collectorId (Ward.collectorId = admin_management.id), try staff by user id (ward_ids)
    let wards = await Ward.findAll({
      where: { collectorId: effectiveCollectorId, isActive: true },
      include: [
        {
          model: Property,
          as: 'properties',
          attributes: ['id']
        }
      ]
    });

    if (wards.length === 0) {
      const staff = await AdminManagement.findOne({
        where: { id: effectiveCollectorId, role: 'COLLECTOR' },
        attributes: ['id', 'ward_ids']
      });
      const wardIds = staff?.ward_ids && Array.isArray(staff.ward_ids) ? staff.ward_ids : [];
      if (wardIds.length > 0) {
        wards = await Ward.findAll({
          where: { id: { [Op.in]: wardIds }, isActive: true },
          include: [
            { model: Property, as: 'properties', attributes: ['id'] }
          ]
        });
      }
    }

    const wardIds = wards.map(w => w.id);
    const allPropertyIds = wards.flatMap(w => (w.properties || []).map(p => p.id));
    const propertyIdToWardId = {};
    wards.forEach(w => {
      (w.properties || []).forEach(p => { propertyIdToWardId[p.id] = w.id; });
    });

    let pendingByWard = {};
    if (allPropertyIds.length > 0) {
      const demands = await Demand.findAll({
        where: {
          propertyId: { [Op.in]: allPropertyIds },
          balanceAmount: { [Op.gt]: 0 }
        },
        attributes: ['propertyId']
      });
      demands.forEach(d => {
        const wid = propertyIdToWardId[d.propertyId];
        if (wid) pendingByWard[wid] = (pendingByWard[wid] || 0) + 1;
      });
    }

    const wardsWithStats = wards.map(ward => {
      const w = ward.toJSON ? ward.toJSON() : { ...ward };
      w.statistics = {
        totalProperties: (ward.properties || []).length,
        pendingDemands: pendingByWard[ward.id] || 0
      };
      delete w.properties;
      return w;
    });

    res.json({
      success: true,
      data: { wards: wardsWithStats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/wards/collector/:collectorId/dashboard
 * @desc    Get collector dashboard statistics
 * @access  Private
 */
export const getCollectorDashboard = async (req, res, next) => {
  try {
    // Use staff_id from JWT token to identify the authenticated collector
    const collectorId = req.user.staff_id || req.user.id;

    // Get all wards assigned to this collector
    const wards = await Ward.findAll({
      where: { collectorId, isActive: true },
      attributes: ['id']
    });
    const wardIds = wards.map(w => w.id);

    if (wardIds.length === 0) {
      return res.json({
        success: true,
        data: {
          dashboard: {
            totalWards: 0,
            totalProperties: 0,
            totalDemands: 0,
            pendingDemands: [],
            overdueDemands: [],
            totalCollection: 0,
            totalOutstanding: 0,
            recentPayments: [],
            propertyWiseDemands: [],
            discountedDemands: [],
            penaltyWaivedDemands: []
          }
        }
      });
    }

    // Get properties in these wards
    const properties = await Property.findAll({
      where: { wardId: { [Op.in]: wardIds } },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

    if (propertyIds.length === 0) {
      return res.json({
        success: true,
        data: {
          dashboard: {
            totalWards: wards.length,
            totalProperties: 0,
            totalDemands: 0,
            pendingDemands: [],
            overdueDemands: [],
            totalCollection: 0,
            totalOutstanding: 0,
            recentPayments: [],
            propertyWiseDemands: [],
            discountedDemands: [],
            penaltyWaivedDemands: []
          }
        }
      });
    }

    // Get unified tax demands (primary source of truth for collector)
    // Fetch demands with UNIFIED_DEMAND in remarks, or regular demands
    const unifiedDemands = await Demand.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        remarks: {
          [Op.like]: '%UNIFIED_DEMAND%'
        },
        balanceAmount: { [Op.gt]: 0 } // Only outstanding demands
      },
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: Ward, as: 'ward' },
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'phone'] }
          ]
        },
        {
          model: DemandItem,
          as: 'items',
          attributes: ['id', 'taxType', 'baseAmount', 'arrearsAmount', 'penaltyAmount', 'interestAmount', 'totalAmount'],
          required: false
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    // Also get non-unified demands for backward compatibility
    const regularDemands = await Demand.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        remarks: {
          [Op.notLike]: '%UNIFIED_DEMAND%'
        },
        balanceAmount: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: Ward, as: 'ward' },
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'phone'] }
          ]
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    // Combine all demands for statistics
    const allDemands = [...unifiedDemands, ...regularDemands];

    // Get payments
    const payments = await Payment.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        status: 'completed'
      }
    });

    // Process unified demands: Group by property and calculate breakdown
    const propertyWiseDemands = {};

    unifiedDemands.forEach(demand => {
      const propertyId = demand.propertyId;

      if (!propertyWiseDemands[propertyId]) {
        propertyWiseDemands[propertyId] = {
          property: demand.property,
          demands: [],
          propertyTax: 0,
          waterTax: 0,
          penalty: 0,
          interest: 0,
          totalPayable: 0,
          dueDate: demand.dueDate,
          status: demand.status
        };
      }

      // Option A: Penalty/interest are stored ONLY at demand level (not distributed to items)
      // Collector wants a clear breakup + one payable amount. We show:
      // - propertyTaxSubtotal = sum(item.base + item.arrears) for PROPERTY items
      // - waterTaxSubtotal = sum(item.base + item.arrears) for WATER items
      // - penalty/interest at demand level
      // - totalPayable = demand.balanceAmount
      let propertyTaxSubtotal = 0;
      let waterTaxSubtotal = 0;

      if (Array.isArray(demand.items) && demand.items.length > 0) {
        demand.items.forEach((item) => {
          const subtotal = parseFloat(item.baseAmount || 0) + parseFloat(item.arrearsAmount || 0);
          if (item.taxType === 'PROPERTY') propertyTaxSubtotal += subtotal;
          if (item.taxType === 'WATER') waterTaxSubtotal += subtotal;
        });
      } else if (typeof demand.remarks === 'string' && demand.remarks.includes('UNIFIED_DEMAND')) {
        // Fallback: attempt to parse remarks JSON breakdown (no hardcoded split)
        try {
          const parsed = JSON.parse(demand.remarks);
          if (parsed?.breakdown?.propertyTax && parsed?.breakdown?.waterTax) {
            propertyTaxSubtotal =
              parseFloat(parsed.breakdown.propertyTax.baseAmount || 0) +
              parseFloat(parsed.breakdown.propertyTax.arrears || 0);
            waterTaxSubtotal =
              parseFloat(parsed.breakdown.waterTax.baseAmount || 0) +
              parseFloat(parsed.breakdown.waterTax.arrears || 0);
          }
        } catch {
          // ignore
        }
      }

      const penaltyAmount = parseFloat(demand.penaltyAmount || 0);
      const interestAmount = parseFloat(demand.interestAmount || 0);
      const balanceAmount = parseFloat(demand.balanceAmount || 0);

      propertyWiseDemands[propertyId].demands.push(demand);
      propertyWiseDemands[propertyId].propertyTax += propertyTaxSubtotal;
      propertyWiseDemands[propertyId].waterTax += waterTaxSubtotal;
      propertyWiseDemands[propertyId].penalty += penaltyAmount;
      propertyWiseDemands[propertyId].interest += interestAmount;
      propertyWiseDemands[propertyId].totalPayable += balanceAmount;

      // Use earliest due date
      if (new Date(demand.dueDate) < new Date(propertyWiseDemands[propertyId].dueDate)) {
        propertyWiseDemands[propertyId].dueDate = demand.dueDate;
      }
    });

    // Convert to array for frontend
    const propertyWiseList = Object.values(propertyWiseDemands).map(item => ({
      propertyId: item.property.id,
      property: item.property,
      propertyTax: Math.round(item.propertyTax * 100) / 100,
      waterTax: Math.round(item.waterTax * 100) / 100,
      penalty: Math.round(item.penalty * 100) / 100,
      interest: Math.round(item.interest * 100) / 100,
      totalPayable: Math.round(item.totalPayable * 100) / 100,
      dueDate: item.dueDate,
      status: item.status,
      demandCount: item.demands.length,
      demands: item.demands.map(d => ({
        id: d.id,
        demandNumber: d.demandNumber,
        financialYear: d.financialYear
      }))
    }));

    // Calculate pending and overdue from unified demands
    const today = new Date();
    const pendingUnifiedDemands = unifiedDemands.filter(d =>
      d.status === 'pending' && parseFloat(d.balanceAmount || 0) > 0
    );
    const overdueUnifiedDemands = unifiedDemands.filter(d => {
      const dueDate = new Date(d.dueDate);
      return today > dueDate && parseFloat(d.balanceAmount || 0) > 0;
    });

    // Discounted demands (active tax_discounts for demands in collector's wards)
    const discountRecords = await TaxDiscount.findAll({
      where: { status: 'ACTIVE' },
      include: [
        {
          model: Demand,
          as: 'demand',
          required: true,
          where: { propertyId: { [Op.in]: propertyIds } },
          include: [
            {
              model: Property,
              as: 'property',
              required: true,
              include: [
                { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'phone'] }
              ]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    const discountedDemands = discountRecords.map((td) => {
      const d = td.demand;
      const owner = d?.property?.owner;
      const citizenName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A' : 'N/A';
      const original = parseFloat(d?.totalAmount || 0);
      const discount = parseFloat(td.discountAmount || 0);
      const finalVal = d?.finalAmount != null ? parseFloat(d.finalAmount) : calculateFinalAmount(d, { discountAmount: discount, waiverAmount: parseFloat(d?.penaltyWaived || 0) }).finalAmount;
      return {
        id: d?.id,
        demandId: d?.id,
        demandNumber: d?.demandNumber,
        citizen: citizenName,
        module: td.moduleType,
        originalAmount: original,
        discountAmount: discount,
        finalAmount: finalVal,
        approvedBy: td.approvedBy,
        date: td.created_at
      };
    });

    // Penalty waived demands (ACTIVE penalty_waivers for demands in collector's wards)
    const waiverRecords = await PenaltyWaiver.findAll({
      where: { status: 'ACTIVE' },
      include: [
        {
          model: Demand,
          as: 'demand',
          required: true,
          include: [
            { model: Property, as: 'property', required: false, include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'phone'] }] },
            { model: WaterTaxAssessment, as: 'waterTaxAssessment', required: false, attributes: ['id', 'propertyId'], include: [{ model: Property, as: 'property', required: false, include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }] }] },
            { model: ShopTaxAssessment, as: 'shopTaxAssessment', required: false, include: [{ model: Shop, as: 'shop', attributes: ['id', 'propertyId'], required: false }] }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    const penaltyWaivedDemands = waiverRecords
      .filter((pw) => {
        const d = pw.demand;
        const propId = d?.propertyId ?? d?.waterTaxAssessment?.propertyId ?? d?.shopTaxAssessment?.shop?.propertyId;
        return propId != null && propertyIds.includes(propId);
      })
      .map((pw) => {
        const d = pw.demand;
        const owner = d?.property?.owner ?? d?.waterTaxAssessment?.property?.owner;
        const citizenName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A' : 'N/A';
        const finalVal = d?.finalAmount != null ? parseFloat(d.finalAmount) : calculateFinalAmount(d, { discountAmount: 0, waiverAmount: parseFloat(pw.waiverAmount || 0) }).finalAmount;
        return {
          id: pw.id,
          demandId: d?.id,
          demandNumber: d?.demandNumber,
          citizen: citizenName,
          module: pw.moduleType,
          penalty: parseFloat(d?.penaltyAmount || 0),
          waived: parseFloat(pw.waiverAmount || 0),
          finalAmount: finalVal,
          approvedBy: pw.approvedBy,
          date: pw.createdAt || pw.created_at
        };
      });

    const dashboard = {
      totalWards: wards.length,
      totalProperties: properties.length,
      totalDemands: allDemands.length,
      pendingDemands: pendingUnifiedDemands,
      overdueDemands: overdueUnifiedDemands,
      totalCollection: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
      totalOutstanding: allDemands
        .reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      recentPayments: payments,
      propertyWiseDemands: propertyWiseList,
      discountedDemands,
      penaltyWaivedDemands
    };

    res.json({
      success: true,
      data: { dashboard }
    });
  } catch (error) {
    next(error);
  }
};
