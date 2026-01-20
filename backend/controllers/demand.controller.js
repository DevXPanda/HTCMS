import { Demand, Assessment, Property, Payment, User, Ward } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   GET /api/demands
 * @desc    Get all tax demands (with filters)
 * @access  Private
 */
export const getAllDemands = async (req, res, next) => {
  try {
    const { 
      propertyId, 
      financialYear, 
      status,
      serviceType, // Filter by service type (HOUSE_TAX or D2DC)
      search,
      minAmount,
      maxAmount,
      overdue,
      page = 1, 
      limit = 10 
    } = req.query;

    const where = {};
    
    if (propertyId) where.propertyId = propertyId;
    if (financialYear) where.financialYear = financialYear;
    if (status) where.status = status;
    if (serviceType) where.serviceType = serviceType; // Filter by service type

    // Search by demand number
    if (search) {
      where.demandNumber = { [Op.iLike]: `%${search}%` };
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount) where.totalAmount[Op.gte] = parseFloat(minAmount);
      if (maxAmount) where.totalAmount[Op.lte] = parseFloat(maxAmount);
    }

    // Filter overdue demands
    if (overdue === 'true') {
      where.status = { [Op.in]: ['overdue', 'pending'] };
      where.dueDate = { [Op.lt]: new Date() };
      where.balanceAmount = { [Op.gt]: 0 };
    }

    // For citizens, show only demands of their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Demand.findAndCountAll({
      where,
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false } // Make assessment optional for D2DC
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        demands: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/demands/:id
 * @desc    Get demand by ID
 * @access  Private
 */
export const getDemandById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const demand = await Demand.findByPk(id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: { exclude: ['password'] } },
            { model: Ward, as: 'ward' }
          ]
        },
        { model: Assessment, as: 'assessment', required: false }, // Optional for D2DC
        { 
          model: Payment, 
          as: 'payments',
          include: [
            { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
      ]
    });

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    // Check access for citizens
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(demand.propertyId);
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { demand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands
 * @desc    Generate tax demand from approved tax assessment (HOUSE_TAX) or D2DC demand
 * @access  Private (Admin, Assessor)
 */
export const createDemand = async (req, res, next) => {
  try {
    const {
      assessmentId,
      propertyId, // Required for D2DC
      serviceType = 'HOUSE_TAX', // Default to HOUSE_TAX for backward compatibility
      financialYear,
      dueDate,
      baseAmount, // Required for D2DC (monthly charge, e.g., ₹50)
      remarks
    } = req.body;

    // Validate serviceType
    if (!['HOUSE_TAX', 'D2DC'].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid serviceType. Must be HOUSE_TAX or D2DC'
      });
    }

    let property;
    let assessment = null;

    if (serviceType === 'HOUSE_TAX') {
      // HOUSE_TAX requires assessment - CRITICAL VALIDATION
      if (!assessmentId) {
        return res.status(400).json({
          success: false,
          message: 'assessmentId is required for HOUSE_TAX demands. HOUSE_TAX demands must be generated from approved tax assessments.'
        });
      }

      // Ensure propertyId is not provided for HOUSE_TAX (it comes from assessment)
      if (propertyId) {
        return res.status(400).json({
          success: false,
          message: 'propertyId should not be provided for HOUSE_TAX demands. It is derived from the assessment.'
        });
      }

      assessment = await Assessment.findByPk(assessmentId, {
        include: [{ model: Property, as: 'property' }]
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Tax Assessment not found'
        });
      }

      // Check if assessment is approved
      if (assessment.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Can only generate demand from approved assessment'
        });
      }

      property = assessment.property;
    } else {
      // D2DC doesn't require assessment - CRITICAL VALIDATION
      // Ensure assessmentId is NOT provided for D2DC
      if (assessmentId) {
        return res.status(400).json({
          success: false,
          message: 'assessmentId should not be provided for D2DC demands. D2DC is a municipal service linked directly to property, not assessment.'
        });
      }

      if (!propertyId) {
        return res.status(400).json({
          success: false,
          message: 'propertyId is required for D2DC demands'
        });
      }

      if (!baseAmount || baseAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'baseAmount is required for D2DC demands (e.g., 50 for ₹50/month)'
        });
      }

      property = await Property.findByPk(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }
    }

    // Check if demand already exists for this property, serviceType, and period
    // For HOUSE_TAX: check by assessmentId + financialYear
    // For D2DC: check by propertyId + serviceType + month/year (using financialYear as period identifier)
    const existingDemandWhere = serviceType === 'HOUSE_TAX' 
      ? { assessmentId, financialYear, serviceType }
      : { propertyId, serviceType, financialYear }; // For D2DC, financialYear can represent month/year

    const existingDemand = await Demand.findOne({
      where: existingDemandWhere
    });

    if (existingDemand) {
      return res.status(400).json({
        success: false,
        message: `Demand already exists for this ${serviceType === 'HOUSE_TAX' ? 'assessment and financial year' : 'property and period'}`
      });
    }

    // Generate demand number
    const demandNumber = serviceType === 'D2DC' 
      ? `D2DC-${financialYear}-${Date.now()}`
      : `DEM-${financialYear}-${Date.now()}`;

    // Calculate arrears from previous unpaid demands of the same serviceType
    const previousDemands = await Demand.findAll({
      where: {
        propertyId: property.id,
        serviceType: serviceType,
        financialYear: { [Op.ne]: financialYear },
        status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
      }
    });

    // Calculate arrears - ensure numeric conversion
    const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
      return sum + parseFloat(prevDemand.balanceAmount || 0);
    }, 0) * 100) / 100;

    // Calculate amounts
    const calculatedBaseAmount = serviceType === 'HOUSE_TAX' 
      ? parseFloat(assessment.annualTaxAmount || 0)
      : parseFloat(baseAmount || 0);
    
    const penaltyAmount = 0; // Can be calculated based on overdue logic
    const interestAmount = 0; // Can be calculated based on overdue logic
    const totalAmount = Math.round((calculatedBaseAmount + arrearsAmount + penaltyAmount + interestAmount) * 100) / 100;
    const balanceAmount = Math.round(totalAmount * 100) / 100;

    // CRITICAL: Ensure assessmentId is explicitly set based on serviceType
    const finalAssessmentId = serviceType === 'HOUSE_TAX' ? assessmentId : null;
    
    // Double-check: D2DC must have null assessmentId
    if (serviceType === 'D2DC' && finalAssessmentId !== null) {
      return res.status(400).json({
        success: false,
        message: 'D2DC demands cannot have an assessmentId. D2DC is a municipal service, not a tax assessment.'
      });
    }

    // Double-check: HOUSE_TAX must have assessmentId
    if (serviceType === 'HOUSE_TAX' && !finalAssessmentId) {
      return res.status(400).json({
        success: false,
        message: 'HOUSE_TAX demands require an assessmentId.'
      });
    }

    const demand = await Demand.create({
      demandNumber,
      propertyId: property.id,
      assessmentId: finalAssessmentId, // Explicitly null for D2DC, required for HOUSE_TAX
      serviceType,
      financialYear,
      baseAmount: calculatedBaseAmount,
      arrearsAmount,
      penaltyAmount,
      interestAmount,
      totalAmount,
      balanceAmount: balanceAmount,
      paidAmount: 0,
      dueDate: new Date(dueDate),
      status: 'pending',
      generatedBy: req.user.id,
      remarks
    });

    const createdDemand = await Demand.findByPk(demand.id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false }
      ]
    });

    // Log demand creation with serviceType
    await auditLogger.logCreate(
      req,
      req.user,
      serviceType === 'D2DC' ? 'D2DC' : 'Demand',
      demand.id,
      { 
        demandNumber: demand.demandNumber, 
        propertyId: demand.propertyId, 
        financialYear: demand.financialYear, 
        totalAmount: demand.totalAmount,
        serviceType: demand.serviceType
      },
      `Created ${serviceType} demand: ${demand.demandNumber}`,
      { propertyId: demand.propertyId, assessmentId: demand.assessmentId, serviceType: demand.serviceType }
    );

    res.status(201).json({
      success: true,
      message: `${serviceType} demand generated successfully`,
      data: { demand: createdDemand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/d2dc
 * @desc    Generate D2DC (garbage collection) demand for a property
 * @access  Private (Admin)
 */
export const createD2DCDemand = async (req, res, next) => {
  try {
    const {
      propertyId,
      month, // e.g., "2024-01" for January 2024
      baseAmount = 50, // Default ₹50/month, configurable
      dueDate,
      remarks
    } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'propertyId is required'
      });
    }

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'month is required (format: YYYY-MM)'
      });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if D2DC demand already exists for this property and month
    const existingDemand = await Demand.findOne({
      where: {
        propertyId,
        serviceType: 'D2DC',
        financialYear: month // Using financialYear field to store month/year for D2DC
      }
    });

    if (existingDemand) {
      return res.status(400).json({
        success: false,
        message: `D2DC demand already exists for ${month}`
      });
    }

    // Calculate arrears from previous unpaid D2DC demands
    const previousDemands = await Demand.findAll({
      where: {
        propertyId,
        serviceType: 'D2DC',
        financialYear: { [Op.ne]: month },
        status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
      }
    });

    const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
      return sum + parseFloat(prevDemand.balanceAmount || 0);
    }, 0) * 100) / 100;

    const calculatedBaseAmount = parseFloat(baseAmount || 50);
    const totalAmount = Math.round((calculatedBaseAmount + arrearsAmount) * 100) / 100;
    const balanceAmount = Math.round(totalAmount * 100) / 100;

    // CRITICAL: D2DC demands MUST have assessmentId = null
    // D2DC is a municipal service, NOT a tax assessment
    // It is linked directly to property, not assessment
    
    const demandNumber = `D2DC-${month}-${Date.now()}`;
    const demand = await Demand.create({
      demandNumber,
      propertyId,
      assessmentId: null, // EXPLICITLY NULL - D2DC doesn't require assessment
      serviceType: 'D2DC',
      financialYear: month,
      baseAmount: calculatedBaseAmount,
      arrearsAmount,
      penaltyAmount: 0,
      interestAmount: 0,
      totalAmount,
      balanceAmount,
      paidAmount: 0,
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      status: 'pending',
      generatedBy: req.user.id,
      remarks
    });

    const createdDemand = await Demand.findByPk(demand.id, {
      include: [
        { 
          model: Property, 
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        }
      ]
    });

    // Log D2DC demand creation
    await auditLogger.logCreate(
      req,
      req.user,
      'D2DC',
      demand.id,
      { 
        demandNumber: demand.demandNumber, 
        propertyId: demand.propertyId, 
        month: month, 
        totalAmount: demand.totalAmount,
        serviceType: 'D2DC'
      },
      `Created D2DC demand: ${demand.demandNumber} for ${month}`,
      { propertyId: demand.propertyId, serviceType: 'D2DC' }
    );

    res.status(201).json({
      success: true,
      message: 'D2DC demand generated successfully',
      data: { demand: createdDemand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/generate-bulk
 * @desc    Generate demands in bulk for a financial year
 * @access  Private (Admin only)
 */
export const generateBulkDemands = async (req, res, next) => {
  try {
    const { financialYear, dueDate } = req.body;

    // Get all approved assessments
    const assessments = await Assessment.findAll({
      where: { status: 'approved' },
      include: [{ model: Property, as: 'property' }]
    });

    const createdDemands = [];
    const errors = [];

    for (const assessment of assessments) {
      try {
        // Check if demand already exists
        const existingDemand = await Demand.findOne({
          where: {
            assessmentId: assessment.id,
            financialYear
          }
        });

        if (existingDemand) {
          errors.push({
            assessmentId: assessment.id,
            message: 'Demand already exists'
          });
          continue;
        }

        // Calculate arrears from previous unpaid demands
        const previousDemands = await Demand.findAll({
          where: {
            propertyId: assessment.propertyId,
            financialYear: { [Op.ne]: financialYear },
            status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
          }
        });

        // Calculate arrears - ensure numeric conversion
        const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
          return sum + parseFloat(prevDemand.balanceAmount || 0);
        }, 0) * 100) / 100;

        const demandNumber = `DEM-${financialYear}-${Date.now()}-${assessment.id}`;
        const baseAmount = parseFloat(assessment.annualTaxAmount || 0);
        const totalAmount = Math.round((baseAmount + arrearsAmount) * 100) / 100;
        const balanceAmount = Math.round(totalAmount * 100) / 100;

        const demand = await Demand.create({
          demandNumber,
          propertyId: assessment.propertyId,
          assessmentId: assessment.id,
          serviceType: 'HOUSE_TAX', // Bulk generation is for house tax only
          financialYear,
          baseAmount,
          arrearsAmount,
          penaltyAmount: 0,
          interestAmount: 0,
          totalAmount,
          balanceAmount: balanceAmount,
          paidAmount: 0,
          dueDate: new Date(dueDate),
          status: 'pending',
          generatedBy: req.user.id
        });

        createdDemands.push(demand);
      } catch (error) {
        errors.push({
          assessmentId: assessment.id,
          message: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${createdDemands.length} demands`,
      data: {
        created: createdDemands.length,
        errors: errors.length,
        details: errors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/demands/:id/calculate-penalty
 * @desc    Calculate and update penalty/interest for overdue demand
 * @access  Private (Admin, Cashier)
 */
export const calculatePenalty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { penaltyRate, interestRate } = req.body;

    const demand = await Demand.findByPk(id);
    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    // Calculate penalty and interest if overdue
    const today = new Date();
    const dueDate = new Date(demand.dueDate);
    
    if (today > dueDate && demand.balanceAmount > 0) {
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      // Calculate penalty (one-time, on base amount + arrears)
      const penaltyBase = parseFloat(demand.baseAmount || 0) + parseFloat(demand.arrearsAmount || 0);
      // Ensure all values are numbers before calculation
      const baseAmount = parseFloat(demand.baseAmount || 0);
      const arrearsAmount = parseFloat(demand.arrearsAmount || 0);
      const paidAmount = parseFloat(demand.paidAmount || 0);
      const balanceAmount = parseFloat(demand.balanceAmount || 0);
      
      const penalty = Math.round((penaltyBase * (penaltyRate || 0.05) / 100) * 100) / 100;
      
      // Calculate interest (daily, on balance amount)
      const interest = Math.round((balanceAmount * (interestRate || 0.01) / 100) * daysOverdue * 100) / 100;
      
      // Calculate totals using proper numeric arithmetic
      const totalAmount = Math.round((baseAmount + arrearsAmount + penalty + interest) * 100) / 100;
      const newBalanceAmount = Math.round((totalAmount - paidAmount) * 100) / 100;
      
      demand.penaltyAmount = penalty;
      demand.interestAmount = interest;
      demand.totalAmount = totalAmount;
      demand.balanceAmount = newBalanceAmount;
      
      if (demand.status === 'pending' && daysOverdue > 0) {
        demand.status = 'overdue';
      }
      
      await demand.save();
    }

    res.json({
      success: true,
      message: 'Penalty and interest calculated',
      data: { demand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/demands/property/:propertyId
 * @desc    Get all demands for a property
 * @access  Private
 */
export const getDemandsByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const demands = await Demand.findAll({
      where: { propertyId },
      include: [
        { model: Assessment, as: 'assessment', required: false }, // Optional for D2DC
        { 
          model: Payment, 
          as: 'payments',
          include: [
            { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
      ],
      order: [['serviceType', 'ASC'], ['financialYear', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { demands }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/demands/statistics/summary
 * @desc    Get demand statistics summary
 * @access  Private (Admin, Cashier)
 */
export const getDemandStatistics = async (req, res, next) => {
  try {
    const { financialYear } = req.query;

    const where = {};
    if (financialYear) where.financialYear = financialYear;

    // For citizens, filter by their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    const demands = await Demand.findAll({ where });

    // Separate statistics by serviceType
    const houseTaxDemands = demands.filter(d => d.serviceType === 'HOUSE_TAX');
    const d2dcDemands = demands.filter(d => d.serviceType === 'D2DC');

    const calculateStats = (demandList) => ({
      total: demandList.length,
      totalAmount: demandList.reduce((sum, d) => sum + parseFloat(d.totalAmount || 0), 0),
      paidAmount: demandList.reduce((sum, d) => sum + parseFloat(d.paidAmount || 0), 0),
      balanceAmount: demandList.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      arrearsAmount: demandList.reduce((sum, d) => sum + parseFloat(d.arrearsAmount || 0), 0),
      penaltyAmount: demandList.reduce((sum, d) => sum + parseFloat(d.penaltyAmount || 0), 0),
      interestAmount: demandList.reduce((sum, d) => sum + parseFloat(d.interestAmount || 0), 0),
      byStatus: {
        pending: demandList.filter(d => d.status === 'pending').length,
        partially_paid: demandList.filter(d => d.status === 'partially_paid').length,
        paid: demandList.filter(d => d.status === 'paid').length,
        overdue: demandList.filter(d => d.status === 'overdue').length,
        cancelled: demandList.filter(d => d.status === 'cancelled').length
      },
      overdue: demandList.filter(d => {
        const today = new Date();
        const dueDate = new Date(d.dueDate);
        return today > dueDate && d.balanceAmount > 0;
      }).length
    });

    const statistics = {
      // Combined statistics
      total: demands.length,
      totalAmount: demands.reduce((sum, d) => sum + parseFloat(d.totalAmount || 0), 0),
      paidAmount: demands.reduce((sum, d) => sum + parseFloat(d.paidAmount || 0), 0),
      balanceAmount: demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      // Separate by serviceType
      houseTax: calculateStats(houseTaxDemands),
      d2dc: calculateStats(d2dcDemands),
      // Overall byStatus
      byStatus: {
        pending: demands.filter(d => d.status === 'pending').length,
        partially_paid: demands.filter(d => d.status === 'partially_paid').length,
        paid: demands.filter(d => d.status === 'paid').length,
        overdue: demands.filter(d => d.status === 'overdue').length,
        cancelled: demands.filter(d => d.status === 'cancelled').length
      },
      overdue: demands.filter(d => {
        const today = new Date();
        const dueDate = new Date(d.dueDate);
        return today > dueDate && d.balanceAmount > 0;
      }).length
    };

    res.json({
      success: true,
      data: { statistics }
    });
  } catch (error) {
    next(error);
  }
};
