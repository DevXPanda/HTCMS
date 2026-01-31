import { WaterConnection, WaterBill, WaterPayment, Property, User, Ward } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { WATER_CONNECTION_STATUS, WATER_BILL_STATUS, WATER_PAYMENT_STATUS, getUnpaidBillStatuses, isSuccessfulPaymentStatus } from '../constants/waterTaxStatuses.js';

/**
 * @route   GET /api/water-dashboard/citizen
 * @desc    Get citizen dashboard data (own connections and bills)
 * @access  Private (Citizen)
 */
export const getCitizenDashboard = async (req, res, next) => {
  try {
    // Get all properties owned by the citizen
    const userProperties = await Property.findAll({
      where: { ownerId: req.user.id, isActive: true },
      attributes: ['id', 'propertyNumber', 'address']
    });
    const propertyIds = userProperties.map(p => p.id);

    if (propertyIds.length === 0) {
      return res.json({
        success: true,
        data: {
          connections: [],
          bills: [],
          summary: {
            totalConnections: 0,
            activeConnections: 0,
            totalBills: 0,
            unpaidBills: 0,
            totalOutstanding: 0
          }
        }
      });
    }

    // Get all water connections for citizen's properties
    const connections = await WaterConnection.findAll({
      where: {
        propertyId: { [Op.in]: propertyIds }
      },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'propertyNumber', 'address', 'city']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get all bills for citizen's connections
    const connectionIds = connections.map(c => c.id);
    
    let bills = [];
    if (connectionIds.length > 0) {
      bills = await WaterBill.findAll({
        where: {
          waterConnectionId: { [Op.in]: connectionIds }
        },
        include: [
          {
            model: WaterConnection,
            as: 'waterConnection',
            attributes: ['id', 'connectionNumber', 'meterNumber'],
            include: [
              { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
            ]
          }
        ],
        order: [['billingPeriod', 'DESC'], ['createdAt', 'DESC']],
        limit: 10 // Recent 10 bills
      });
    }

    // Calculate summary
    const activeConnections = connections.filter(c => c.status === WATER_CONNECTION_STATUS.ACTIVE).length;
    const unpaidBills = bills.filter(b => getUnpaidBillStatuses().includes(b.status));
    const totalOutstanding = unpaidBills.reduce((sum, bill) => {
      return sum + (parseFloat(bill.balanceAmount) || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        connections,
        bills,
        summary: {
          totalConnections: connections.length,
          activeConnections,
          totalBills: bills.length,
          unpaidBills: unpaidBills.length,
          totalOutstanding
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-dashboard/collector
 * @desc    Get collector dashboard data (all connections, unpaid bills, collection summary)
 * @access  Private (Collector)
 */
export const getCollectorDashboard = async (req, res, next) => {
  try {
    const { wardId, status } = req.query;

    // Build connection filter
    const connectionWhere = {};
    if (status) {
      connectionWhere.status = status;
    }

    // Build property filter for ward-based filtering
    const propertyInclude = {
      model: Property,
      as: 'property',
      attributes: ['id', 'propertyNumber', 'address', 'city', 'wardId'],
      include: [
        { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
      ]
    };

    if (wardId) {
      propertyInclude.where = { wardId: parseInt(wardId) };
      propertyInclude.required = true;
    }

    // Get all connections (with optional filters)
    const connections = await WaterConnection.findAll({
      where: connectionWhere,
      include: [propertyInclude],
      order: [['createdAt', 'DESC']],
      limit: 50 // Recent 50 connections for dashboard
    });

    // Get unpaid bills
    const unpaidBillsWhere = {
      status: {
        [Op.in]: getUnpaidBillStatuses()
      }
    };

    if (wardId) {
      // Get connection IDs for the ward
      const wardConnections = await WaterConnection.findAll({
        include: [
          {
            model: Property,
            as: 'property',
            where: { wardId: parseInt(wardId) },
            attributes: ['id']
          }
        ],
        attributes: ['id']
      });
      const connectionIds = wardConnections.map(c => c.id);
      
      if (connectionIds.length > 0) {
        unpaidBillsWhere.waterConnectionId = { [Op.in]: connectionIds };
      } else {
        unpaidBillsWhere.waterConnectionId = { [Op.in]: [] }; // No connections in ward
      }
    }

    const unpaidBills = await WaterBill.findAll({
      where: unpaidBillsWhere,
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status'],
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'propertyNumber', 'address', 'city'],
              include: [
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
              ]
            }
          ]
        }
      ],
      order: [['dueDate', 'ASC'], ['billingPeriod', 'DESC']],
      limit: 50 // Recent 50 unpaid bills
    });

    // Calculate collection summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const paymentWhere = {
        status: WATER_PAYMENT_STATUS.COMPLETED,
      paymentDate: {
        [Op.gte]: today,
        [Op.lt]: tomorrow
      }
    };

    if (wardId) {
      // Get connection IDs for the ward
      const wardConnections = await WaterConnection.findAll({
        include: [
          {
            model: Property,
            as: 'property',
            where: { wardId: parseInt(wardId) },
            attributes: ['id']
          }
        ],
        attributes: ['id']
      });
      const connectionIds = wardConnections.map(c => c.id);
      
      if (connectionIds.length > 0) {
        paymentWhere.waterConnectionId = { [Op.in]: connectionIds };
      } else {
        paymentWhere.waterConnectionId = { [Op.in]: [] }; // No connections in ward
      }
    }

    const todayPayments = await WaterPayment.findAll({
      where: paymentWhere,
      attributes: ['id', 'amount']
    });

    const todayCollection = todayPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);

    // Calculate total outstanding
    const totalOutstanding = unpaidBills.reduce((sum, bill) => {
      return sum + (parseFloat(bill.balanceAmount) || 0);
    }, 0);

    // Get connection statistics
    const totalConnections = await WaterConnection.count({
      where: connectionWhere,
      include: wardId ? [
        {
          model: Property,
          as: 'property',
          where: { wardId: parseInt(wardId) },
          required: true
        }
      ] : []
    });

    const activeConnections = await WaterConnection.count({
      where: { ...connectionWhere, status: WATER_CONNECTION_STATUS.ACTIVE },
      include: wardId ? [
        {
          model: Property,
          as: 'property',
          where: { wardId: parseInt(wardId) },
          required: true
        }
      ] : []
    });

    // Get bill statistics
    const billWhere = {};
    if (wardId) {
      const wardConnections = await WaterConnection.findAll({
        include: [
          {
            model: Property,
            as: 'property',
            where: { wardId: parseInt(wardId) },
            attributes: ['id']
          }
        ],
        attributes: ['id']
      });
      const connectionIds = wardConnections.map(c => c.id);
      
      if (connectionIds.length > 0) {
        billWhere.waterConnectionId = { [Op.in]: connectionIds };
      } else {
        billWhere.waterConnectionId = { [Op.in]: [] };
      }
    }

    const totalBills = await WaterBill.count({ where: billWhere });
    const unpaidBillsCount = await WaterBill.count({
      where: {
        ...billWhere,
        status: { [Op.in]: getUnpaidBillStatuses() }
      }
    });

    res.json({
      success: true,
      data: {
        connections,
        unpaidBills,
        summary: {
          totalConnections,
          activeConnections,
          totalBills,
          unpaidBills: unpaidBillsCount,
          totalOutstanding,
          todayCollection,
          todayPaymentsCount: todayPayments.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-dashboard/collector/unpaid-bills
 * @desc    Get unpaid bills for collector (with pagination)
 * @access  Private (Collector)
 */
export const getCollectorUnpaidBills = async (req, res, next) => {
  try {
    const {
      wardId,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const where = {
      status: {
        [Op.in]: getUnpaidBillStatuses()
      }
    };

    // Ward-based filtering
    if (wardId) {
      const wardConnections = await WaterConnection.findAll({
        include: [
          {
            model: Property,
            as: 'property',
            where: { wardId: parseInt(wardId) },
            attributes: ['id']
          }
        ],
        attributes: ['id']
      });
      const connectionIds = wardConnections.map(c => c.id);
      
      if (connectionIds.length > 0) {
        where.waterConnectionId = { [Op.in]: connectionIds };
      } else {
        where.waterConnectionId = { [Op.in]: [] }; // No connections in ward
      }
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { billNumber: { [Op.iLike]: `%${search}%` } },
        { billingPeriod: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await WaterBill.findAndCountAll({
      where,
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status'],
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'propertyNumber', 'address', 'city'],
              include: [
                { 
                  model: User, 
                  as: 'owner', 
                  attributes: ['id', 'firstName', 'lastName', 'phone', 'email'] 
                },
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
              ]
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['dueDate', 'ASC'], ['billingPeriod', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        unpaidBills: rows,
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
 * @route   GET /api/water-dashboard/collector/collection-summary
 * @desc    Get collection summary for collector
 * @access  Private (Collector)
 */
export const getCollectorCollectionSummary = async (req, res, next) => {
  try {
    const { wardId, startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paymentDate = {};
      if (startDate) dateFilter.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.paymentDate[Op.lte] = end;
      }
    }

    // Build connection filter for ward
    let connectionIds = null;
    if (wardId) {
      const wardConnections = await WaterConnection.findAll({
        include: [
          {
            model: Property,
            as: 'property',
            where: { wardId: parseInt(wardId) },
            attributes: ['id']
          }
        ],
        attributes: ['id']
      });
      connectionIds = wardConnections.map(c => c.id);
    }

    const paymentWhere = {
        status: WATER_PAYMENT_STATUS.COMPLETED,
      ...dateFilter
    };

    if (connectionIds !== null) {
      if (connectionIds.length > 0) {
        paymentWhere.waterConnectionId = { [Op.in]: connectionIds };
      } else {
        paymentWhere.waterConnectionId = { [Op.in]: [] }; // No connections
      }
    }

    // Get all payments
    const payments = await WaterPayment.findAll({
      where: paymentWhere,
      include: [
        {
          model: WaterBill,
          as: 'waterBill',
          attributes: ['id', 'billNumber', 'billingPeriod']
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber'],
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'propertyNumber', 'address'],
              include: [
                { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
              ]
            }
          ]
        }
      ],
      order: [['paymentDate', 'DESC']]
    });

    // Calculate summary by payment mode
    const summaryByMode = {};
    const validModes = ['cash', 'cheque', 'dd', 'online', 'card', 'upi'];
    validModes.forEach(mode => {
      summaryByMode[mode] = {
        count: 0,
        amount: 0
      };
    });

    let totalCollection = 0;
    payments.forEach(payment => {
      const amount = parseFloat(payment.amount) || 0;
      totalCollection += amount;
      
      const mode = payment.paymentMode;
      if (summaryByMode[mode]) {
        summaryByMode[mode].count += 1;
        summaryByMode[mode].amount += amount;
      }
    });

    // Calculate daily collection (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayPayments = payments.filter(p => {
        const paymentDate = new Date(p.paymentDate);
        return paymentDate >= date && paymentDate < nextDate;
      });

      const dayTotal = dayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      last7Days.push({
        date: date.toISOString().split('T')[0],
        count: dayPayments.length,
        amount: dayTotal
      });
    }

    res.json({
      success: true,
      data: {
        totalCollection,
        totalPayments: payments.length,
        summaryByMode,
        last7Days,
        payments: payments.slice(0, 20) // Recent 20 payments
      }
    });
  } catch (error) {
    next(error);
  }
};
