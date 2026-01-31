import { Ward, User, Property, Demand, DemandItem, Payment } from '../models/index.js';
import { Op } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   GET /api/wards
 * @desc    Get all wards
 * @access  Private
 */
export const getAllWards = async (req, res, next) => {
  try {
    const { isActive, search } = req.query;

    const where = {};
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
          model: User, 
          as: 'collector', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
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
          model: User, 
          as: 'collector', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
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
    const { wardNumber, wardName, description, collectorId } = req.body;

    // Check if ward number already exists
    const existingWard = await Ward.findOne({
      where: { wardNumber }
    });

    if (existingWard) {
      return res.status(400).json({
        success: false,
        message: 'Ward with this number already exists'
      });
    }

    // Validate collector if provided
    if (collectorId) {
      const collector = await User.findByPk(collectorId);
      if (!collector || collector.role !== 'collector') {
        return res.status(400).json({
          success: false,
          message: 'Invalid collector. User must have collector role.'
        });
      }
    }

    const ward = await Ward.create({
      wardNumber,
      wardName,
      description,
      collectorId
    });

    const createdWard = await Ward.findByPk(ward.id, {
      include: [
        { 
          model: User, 
          as: 'collector', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
        }
      ]
    });

    // Log ward creation
    await auditLogger.logCreate(
      req,
      req.user,
      'Ward',
      ward.id,
      { wardNumber: ward.wardNumber, wardName: ward.wardName, collectorId: ward.collectorId },
      `Created ward: ${ward.wardNumber} - ${ward.wardName}`
    );

    res.status(201).json({
      success: true,
      message: 'Ward created successfully',
      data: { ward: createdWard }
    });
  } catch (error) {
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
    const { wardName, description, collectorId } = req.body;

    const ward = await Ward.findByPk(id);
    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    // Capture previous data for audit log
    const previousData = {
      wardName: ward.wardName,
      collectorId: ward.collectorId
    };

    // Validate collector if provided
    if (collectorId) {
      const collector = await User.findByPk(collectorId);
      if (!collector || collector.role !== 'collector') {
        return res.status(400).json({
          success: false,
          message: 'Invalid collector. User must have collector role.'
        });
      }
    }

    const isCollectorAssignment = collectorId !== undefined && collectorId !== ward.collectorId;
    
    if (wardName) ward.wardName = wardName;
    if (description !== undefined) ward.description = description;
    if (collectorId !== undefined) {
      ward.collectorId = collectorId;
    }

    await ward.save();

    // Log based on what changed
    const newData = {
      wardName: ward.wardName,
      collectorId: ward.collectorId
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
          model: User, 
          as: 'collector', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
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

    if (!collectorId) {
      return res.status(400).json({
        success: false,
        message: 'Collector ID is required'
      });
    }

    const ward = await Ward.findByPk(id);
    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found'
      });
    }

    const collector = await User.findByPk(collectorId);
    if (!collector || collector.role !== 'collector') {
      return res.status(400).json({
        success: false,
        message: 'Invalid collector. User must have collector role.'
      });
    }

    const previousCollectorId = ward.collectorId;
    ward.collectorId = collectorId;
    await ward.save();

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
          model: User, 
          as: 'collector', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] 
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
      }
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
 * @desc    Get all wards assigned to a collector
 * @access  Private
 */
export const getWardsByCollector = async (req, res, next) => {
  try {
    const { collectorId } = req.params;

    const wards = await Ward.findAll({
      where: { collectorId, isActive: true },
      include: [
        {
          model: Property,
          as: 'properties',
          attributes: ['id']
        }
      ]
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
 * @route   GET /api/wards/collector/:collectorId/dashboard
 * @desc    Get collector dashboard statistics
 * @access  Private
 */
export const getCollectorDashboard = async (req, res, next) => {
  try {
    const collectorId = req.params.collectorId || req.user.id;

    // Get all wards assigned to this collector
    const wards = await Ward.findAll({
      where: { collectorId, isActive: true },
      attributes: ['id']
    });
    const wardIds = wards.map(w => w.id);

    // Get properties in these wards
    const properties = await Property.findAll({
      where: { wardId: { [Op.in]: wardIds } },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

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

    const dashboard = {
      totalWards: wards.length,
      totalProperties: properties.length,
      totalDemands: allDemands.length,
      pendingDemands: pendingUnifiedDemands,
      overdueDemands: overdueUnifiedDemands,
      totalCollection: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
      totalOutstanding: allDemands
        .reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      recentPayments: payments.slice(0, 10).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)),
      // New: Property-wise unified demands with breakdown
      propertyWiseDemands: propertyWiseList
    };

    res.json({
      success: true,
      data: { dashboard }
    });
  } catch (error) {
    next(error);
  }
};
