import { Demand, Assessment, Property, Payment, User, Ward } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';

/**
 * @route   GET /api/demands
 * @desc    Get all demands (with filters)
 * @access  Private
 */
export const getAllDemands = async (req, res, next) => {
  try {
    const { 
      propertyId, 
      financialYear, 
      status,
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
        { model: Assessment, as: 'assessment' }
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
        { model: Assessment, as: 'assessment' },
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
        message: 'Demand not found'
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
 * @desc    Generate demand from approved assessment
 * @access  Private (Admin, Assessor)
 */
export const createDemand = async (req, res, next) => {
  try {
    const {
      assessmentId,
      financialYear,
      dueDate,
      remarks
    } = req.body;

    // Get assessment
    const assessment = await Assessment.findByPk(assessmentId, {
      include: [{ model: Property, as: 'property' }]
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check if assessment is approved
    if (assessment.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only generate demand from approved assessment'
      });
    }

    // Check if demand already exists for this assessment and financial year
    const existingDemand = await Demand.findOne({
      where: {
        assessmentId,
        financialYear
      }
    });

    if (existingDemand) {
      return res.status(400).json({
        success: false,
        message: 'Demand already exists for this assessment and financial year'
      });
    }

    // Generate demand number
    const demandNumber = `DEM-${financialYear}-${Date.now()}`;

    // Calculate arrears from previous unpaid demands
    const previousDemands = await Demand.findAll({
      where: {
        propertyId: assessment.propertyId,
        financialYear: { [Op.ne]: financialYear },
        status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
      }
    });

    const arrearsAmount = previousDemands.reduce((sum, prevDemand) => {
      return sum + parseFloat(prevDemand.balanceAmount || 0);
    }, 0);

    // Calculate amounts
    const baseAmount = assessment.annualTaxAmount;
    const penaltyAmount = 0; // Can be calculated based on overdue logic
    const interestAmount = 0; // Can be calculated based on overdue logic
    const totalAmount = baseAmount + arrearsAmount + penaltyAmount + interestAmount;

    const demand = await Demand.create({
      demandNumber,
      propertyId: assessment.propertyId,
      assessmentId,
      financialYear,
      baseAmount,
      arrearsAmount,
      penaltyAmount,
      interestAmount,
      totalAmount,
      balanceAmount: totalAmount,
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
        { model: Assessment, as: 'assessment' }
      ]
    });

    // Log demand creation
    await auditLogger.logCreate(
      req,
      req.user,
      'Demand',
      demand.id,
      { demandNumber: demand.demandNumber, propertyId: demand.propertyId, financialYear: demand.financialYear, totalAmount: demand.totalAmount },
      `Created demand: ${demand.demandNumber}`,
      { propertyId: demand.propertyId, assessmentId: demand.assessmentId }
    );

    res.status(201).json({
      success: true,
      message: 'Demand generated successfully',
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

        const arrearsAmount = previousDemands.reduce((sum, prevDemand) => {
          return sum + parseFloat(prevDemand.balanceAmount || 0);
        }, 0);

        const demandNumber = `DEM-${financialYear}-${Date.now()}-${assessment.id}`;
        const baseAmount = assessment.annualTaxAmount;
        const totalAmount = baseAmount + arrearsAmount;

        const demand = await Demand.create({
          demandNumber,
          propertyId: assessment.propertyId,
          assessmentId: assessment.id,
          financialYear,
          baseAmount,
          arrearsAmount,
          penaltyAmount: 0,
          interestAmount: 0,
          totalAmount,
          balanceAmount: totalAmount,
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
        message: 'Demand not found'
      });
    }

    // Calculate penalty and interest if overdue
    const today = new Date();
    const dueDate = new Date(demand.dueDate);
    
    if (today > dueDate && demand.balanceAmount > 0) {
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      // Calculate penalty (one-time, on base amount + arrears)
      const penaltyBase = parseFloat(demand.baseAmount || 0) + parseFloat(demand.arrearsAmount || 0);
      const penalty = penaltyBase * (penaltyRate || 0.05) / 100;
      
      // Calculate interest (daily, on balance amount)
      const interest = (demand.balanceAmount * (interestRate || 0.01) / 100) * daysOverdue;
      
      demand.penaltyAmount = penalty;
      demand.interestAmount = interest;
      demand.totalAmount = demand.baseAmount + demand.arrearsAmount + penalty + interest;
      demand.balanceAmount = demand.totalAmount - demand.paidAmount;
      
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
        { model: Assessment, as: 'assessment' },
        { 
          model: Payment, 
          as: 'payments',
          include: [
            { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
      ],
      order: [['financialYear', 'DESC'], ['createdAt', 'DESC']]
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

    const statistics = {
      total: demands.length,
      totalAmount: demands.reduce((sum, d) => sum + parseFloat(d.totalAmount || 0), 0),
      paidAmount: demands.reduce((sum, d) => sum + parseFloat(d.paidAmount || 0), 0),
      balanceAmount: demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      arrearsAmount: demands.reduce((sum, d) => sum + parseFloat(d.arrearsAmount || 0), 0),
      penaltyAmount: demands.reduce((sum, d) => sum + parseFloat(d.penaltyAmount || 0), 0),
      interestAmount: demands.reduce((sum, d) => sum + parseFloat(d.interestAmount || 0), 0),
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
