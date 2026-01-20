import { Property, Demand, Payment, Assessment, Ward, Notice } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * @route   GET /api/citizen/dashboard
 * @desc    Get citizen dashboard data
 * @access  Private (Citizen)
 */
export const getCitizenDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user properties
    const properties = await Property.findAll({
      where: { ownerId: userId, isActive: true },
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ]
    });

    const propertyIds = properties.map(p => p.id);

    // Get total outstanding - separate by serviceType
    const demands = await Demand.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        balanceAmount: { [Op.gt]: 0 }
      }
    });

    const houseTaxDemands = demands.filter(d => d.serviceType === 'HOUSE_TAX');
    const d2dcDemands = demands.filter(d => d.serviceType === 'D2DC');
    
    const totalOutstanding = demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);
    const houseTaxOutstanding = houseTaxDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);
    const d2dcOutstanding = d2dcDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);

    // Get recent payments
    const recentPayments = await Payment.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        status: 'completed'
      },
      include: [
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'financialYear', 'serviceType'], required: false }
      ],
      order: [['paymentDate', 'DESC']],
      limit: 5
    });

    // Get pending demands - separate by serviceType
    const pendingDemands = await Demand.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds },
        status: { [Op.in]: ['pending', 'overdue'] },
        balanceAmount: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        { model: Assessment, as: 'assessment', attributes: ['id', 'assessmentNumber'], required: false }
      ],
      order: [['serviceType', 'ASC'], ['dueDate', 'ASC']]
    });

    const pendingHouseTaxDemands = pendingDemands.filter(d => d.serviceType === 'HOUSE_TAX');
    const pendingD2dcDemands = pendingDemands.filter(d => d.serviceType === 'D2DC');

    // Get active notices count (not resolved)
    const activeNotices = await Notice.count({
      where: {
        ownerId: userId,
        status: { [Op.in]: ['generated', 'sent', 'viewed'] }
      }
    });

    res.json({
      success: true,
      data: {
        properties: properties.length,
        totalOutstanding,
        houseTaxOutstanding,
        d2dcOutstanding,
        pendingDemands: pendingDemands.length,
        pendingHouseTaxDemands: pendingHouseTaxDemands.length,
        pendingD2dcDemands: pendingD2dcDemands.length,
        activeNotices,
        recentPayments,
        pendingDemandsList: pendingDemands,
        pendingHouseTaxDemandsList: pendingHouseTaxDemands,
        pendingD2dcDemandsList: pendingD2dcDemands
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/properties
 * @desc    Get citizen's properties
 * @access  Private (Citizen)
 */
export const getCitizenProperties = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const properties = await Property.findAll({
      where: { ownerId: userId, isActive: true },
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { properties }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/citizen/demands
 * @desc    Get citizen's demands
 * @access  Private (Citizen)
 */
export const getCitizenDemands = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const properties = await Property.findAll({
      where: { ownerId: userId },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

    const where = {
      propertyId: { [Op.in]: propertyIds }
    };
    if (status) where.status = status;

    const demands = await Demand.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        { model: Assessment, as: 'assessment', attributes: ['id', 'assessmentNumber', 'assessmentYear'], required: false }
      ],
      order: [['serviceType', 'ASC'], ['dueDate', 'ASC']]
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
 * @route   GET /api/citizen/payments
 * @desc    Get citizen's payment history
 * @access  Private (Citizen)
 */
export const getCitizenPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const properties = await Property.findAll({
      where: { ownerId: userId },
      attributes: ['id']
    });
    const propertyIds = properties.map(p => p.id);

    const where = {
      propertyId: { [Op.in]: propertyIds },
      status: 'completed'
    };

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) where.paymentDate[Op.lte] = new Date(endDate);
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address']
        },
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'financialYear', 'serviceType'], required: false }
      ],
      order: [['paymentDate', 'DESC']]
    });

    res.json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    next(error);
  }
};
