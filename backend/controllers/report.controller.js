import { Payment, Demand, Property, Assessment, Ward, User } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Admin, Assessor, Cashier)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt[Op.gte] = new Date(startDate);
      if (endDate) dateFilter.createdAt[Op.lte] = new Date(endDate);
    }

    // Total Properties
    const totalProperties = await Property.count({
      where: { isActive: true, ...dateFilter }
    });

    // Total Assessments
    const totalAssessments = await Assessment.count({
      where: dateFilter
    });

    // Approved Assessments
    const approvedAssessments = await Assessment.count({
      where: { status: 'approved', ...dateFilter }
    });

    // Total Demands
    const totalDemands = await Demand.count({
      where: dateFilter
    });

    // Total Revenue - separate by serviceType
    const payments = await Payment.findAll({
      where: {
        status: 'completed',
        ...(startDate || endDate ? {
          paymentDate: {
            ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
            ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
          }
        } : {})
      },
      include: [
        { model: Demand, as: 'demand', attributes: ['id', 'serviceType'], required: false }
      ]
    });

    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const houseTaxRevenue = payments
      .filter(p => p.demand?.serviceType === 'HOUSE_TAX')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const d2dcRevenue = payments
      .filter(p => p.demand?.serviceType === 'D2DC')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Pending Demands
    const pendingDemands = await Demand.count({
      where: { status: 'pending' }
    });

    // Overdue Demands
    const overdueDemands = await Demand.count({
      where: {
        status: 'overdue',
        balanceAmount: { [Op.gt]: 0 }
      }
    });

    // Total Outstanding Amount - separate by serviceType
    const outstandingDemands = await Demand.findAll({
      where: {
        balanceAmount: { [Op.gt]: 0 }
      },
      attributes: ['id', 'balanceAmount', 'serviceType']
    });

    const totalOutstanding = outstandingDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);
    const houseTaxOutstanding = outstandingDemands
      .filter(d => d.serviceType === 'HOUSE_TAX')
      .reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);
    const d2dcOutstanding = outstandingDemands
      .filter(d => d.serviceType === 'D2DC')
      .reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);

    // Separate demands by serviceType
    const houseTaxDemands = await Demand.count({
      where: { serviceType: 'HOUSE_TAX', ...dateFilter }
    });
    const d2dcDemands = await Demand.count({
      where: { serviceType: 'D2DC', ...dateFilter }
    });

    res.json({
      success: true,
      data: {
        totalProperties,
        totalAssessments,
        approvedAssessments,
        totalDemands,
        houseTaxDemands,
        d2dcDemands,
        totalRevenue,
        houseTaxRevenue,
        d2dcRevenue,
        pendingDemands,
        overdueDemands,
        totalOutstanding,
        houseTaxOutstanding,
        d2dcOutstanding
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/revenue
 * @desc    Get revenue report
 * @access  Private (Admin, Cashier)
 */
export const getRevenueReport = async (req, res, next) => {
  try {
    const { startDate, endDate, wardId, paymentMode } = req.query;

    const where = {
      status: 'completed'
    };

    if (paymentMode) where.paymentMode = paymentMode;

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) where.paymentDate[Op.lte] = new Date(endDate);
    }

    if (wardId) {
      const properties = await Property.findAll({
        where: { wardId },
        attributes: ['id']
      });
      const propertyIds = properties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: Ward, as: 'ward' },
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
          ]
        },
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] },
        { model: Demand, as: 'demand', attributes: ['id', 'demandNumber', 'serviceType'], required: false }
      ],
      order: [['paymentDate', 'DESC']]
    });

    // Calculate totals - separate by serviceType
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const houseTaxAmount = payments
      .filter(p => p.demand?.serviceType === 'HOUSE_TAX')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const d2dcAmount = payments
      .filter(p => p.demand?.serviceType === 'D2DC')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    // Group by payment mode
    const byPaymentMode = payments.reduce((acc, p) => {
      acc[p.paymentMode] = (acc[p.paymentMode] || 0) + parseFloat(p.amount);
      return acc;
    }, {});

    // Group by serviceType
    const byServiceType = {
      HOUSE_TAX: houseTaxAmount,
      D2DC: d2dcAmount
    };

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          totalAmount,
          houseTaxAmount,
          d2dcAmount,
          totalCount: payments.length,
          houseTaxCount: payments.filter(p => p.demand?.serviceType === 'HOUSE_TAX').length,
          d2dcCount: payments.filter(p => p.demand?.serviceType === 'D2DC').length,
          byPaymentMode,
          byServiceType
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/outstanding
 * @desc    Get outstanding demands report
 * @access  Private (Admin, Tax Collector)
 */
export const getOutstandingReport = async (req, res, next) => {
  try {
    const { wardId, status } = req.query;

    const where = {
      balanceAmount: { [Op.gt]: 0 }
    };

    if (status) where.status = status;

    let propertyWhere = {};
    if (wardId) propertyWhere.wardId = wardId;

    const demands = await Demand.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          where: propertyWhere,
          include: [
            { model: Ward, as: 'ward' },
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false }
      ],
      order: [['serviceType', 'ASC'], ['dueDate', 'ASC']]
    });

    // Separate by serviceType
    const houseTaxDemands = demands.filter(d => d.serviceType === 'HOUSE_TAX');
    const d2dcDemands = demands.filter(d => d.serviceType === 'D2DC');
    
    const houseTaxOutstanding = houseTaxDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);
    const d2dcOutstanding = d2dcDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);

    const totalOutstanding = demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);

    res.json({
      success: true,
      data: {
        demands,
        houseTaxDemands,
        d2dcDemands,
        summary: {
          totalOutstanding,
          houseTaxOutstanding,
          d2dcOutstanding,
          totalCount: demands.length,
          houseTaxCount: houseTaxDemands.length,
          d2dcCount: d2dcDemands.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/ward-wise
 * @desc    Get ward-wise collection report
 * @access  Private (Admin)
 */
export const getWardWiseReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const wards = await Ward.findAll({
      where: { isActive: true },
      include: [
        { model: User, as: 'collector', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    const report = await Promise.all(wards.map(async (ward) => {
      const properties = await Property.findAll({
        where: { wardId: ward.id },
        attributes: ['id']
      });
      const propertyIds = properties.map(p => p.id);

      const payments = await Payment.findAll({
        where: {
          propertyId: { [Op.in]: propertyIds },
          status: 'completed',
          ...(startDate || endDate ? {
            paymentDate: {
              ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
              ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
            }
          } : {})
        }
      });

      const demands = await Demand.findAll({
        where: {
          propertyId: { [Op.in]: propertyIds }
        }
      });

      const totalCollection = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalOutstanding = demands
        .filter(d => parseFloat(d.balanceAmount) > 0)
        .reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);

      return {
        ward: {
          id: ward.id,
          wardNumber: ward.wardNumber,
          wardName: ward.wardName,
          collector: ward.collector
        },
        totalProperties: properties.length,
        totalCollection,
        totalOutstanding,
        paymentCount: payments.length
      };
    }));

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    next(error);
  }
};
