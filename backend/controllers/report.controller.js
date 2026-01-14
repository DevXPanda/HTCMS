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

    // Total Revenue
    const revenueResult = await Payment.sum('amount', {
      where: {
        status: 'completed',
        ...(startDate || endDate ? {
          paymentDate: {
            ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
            ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
          }
        } : {})
      }
    });
    const totalRevenue = revenueResult || 0;

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

    // Total Outstanding Amount
    const outstandingResult = await Demand.sum('balanceAmount', {
      where: {
        balanceAmount: { [Op.gt]: 0 }
      }
    });
    const totalOutstanding = outstandingResult || 0;

    res.json({
      success: true,
      data: {
        totalProperties,
        totalAssessments,
        approvedAssessments,
        totalDemands,
        totalRevenue,
        pendingDemands,
        overdueDemands,
        totalOutstanding
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
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['paymentDate', 'DESC']]
    });

    // Calculate totals
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    // Group by payment mode
    const byPaymentMode = payments.reduce((acc, p) => {
      acc[p.paymentMode] = (acc[p.paymentMode] || 0) + parseFloat(p.amount);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          totalAmount,
          totalCount: payments.length,
          byPaymentMode
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
        { model: Assessment, as: 'assessment' }
      ],
      order: [['dueDate', 'ASC']]
    });

    const totalOutstanding = demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);

    res.json({
      success: true,
      data: {
        demands,
        summary: {
          totalOutstanding,
          totalCount: demands.length
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
