import { WaterBill, WaterConnection, WaterMeterReading, Property, User } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { WATER_BILL_STATUS, WATER_CONNECTION_STATUS, getUnpaidBillStatuses } from '../constants/waterTaxStatuses.js';
import { generateWaterBillNumber } from '../services/uniqueIdService.js';

/**
 * Format billing period (YYYY-MM)
 */
const formatBillingPeriod = (year, month) => {
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}`;
};

/**
 * Calculate arrears from previous unpaid bills
 */
const calculateArrears = async (waterConnectionId, transaction = null) => {
  const unpaidBills = await WaterBill.findAll({
    where: {
      waterConnectionId,
      status: {
        [Op.in]: getUnpaidBillStatuses()
      },
      // Also check balanceAmount > 0.01 to handle floating point precision
      balanceAmount: {
        [Op.gt]: 0.01
      }
    },
    order: [['billingPeriod', 'ASC']],
    transaction
  });

  let totalArrears = 0;
  unpaidBills.forEach(bill => {
    const balance = parseFloat(bill.balanceAmount) || 0;
    totalArrears += balance;
  });

  return Math.round(totalArrears * 100) / 100; // Round to 2 decimal places
};

/**
 * @route   POST /api/water-bills/generate
 * @desc    Generate water bill for a connection
 * @access  Private
 */
export const generateWaterBill = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    // Support both snake_case and camelCase
    const {
      waterConnectionId,
      water_connection_id,
      billingPeriod,
      billing_period,
      year,
      month,
      dueDate,
      due_date,
      remarks
    } = req.body;

    // Normalize to camelCase
    const normalizedWaterConnectionId = waterConnectionId || water_connection_id;
    let normalizedBillingPeriod = billingPeriod || billing_period;

    // Validate mandatory fields
    const missingFields = [];
    if (!normalizedWaterConnectionId || normalizedWaterConnectionId === '' || normalizedWaterConnectionId === null || normalizedWaterConnectionId === undefined) {
      missingFields.push('water_connection_id');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Generate billing period if not provided
    if (!normalizedBillingPeriod) {
      if (year && month) {
        normalizedBillingPeriod = formatBillingPeriod(year, month);
      } else {
        // Default to current month
        const now = new Date();
        normalizedBillingPeriod = formatBillingPeriod(now.getFullYear(), now.getMonth() + 1);
      }
    }

    // Validate billing period format (YYYY-MM)
    const billingPeriodRegex = /^\d{4}-\d{2}$/;
    if (!billingPeriodRegex.test(normalizedBillingPeriod)) {
      return res.status(400).json({
        success: false,
        message: 'billing_period must be in format YYYY-MM (e.g., 2024-01)'
      });
    }

    // Fetch water connection and validate it exists and is ACTIVE
    const waterConnection = await WaterConnection.findOne({
      where: { id: normalizedWaterConnectionId },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'wardId'] }
      ],
      transaction
    });

    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    // Validate connection is ACTIVE
    if (waterConnection.status !== WATER_CONNECTION_STATUS.ACTIVE) {
      return res.status(400).json({
        success: false,
        message: `Bills can only be generated for ACTIVE connections. Current status: ${waterConnection.status}`
      });
    }

    // Check for duplicate bill for same period
    const existingBill = await WaterBill.findOne({
      where: {
        waterConnectionId: normalizedWaterConnectionId,
        billingPeriod: normalizedBillingPeriod
      },
      transaction
    });

    if (existingBill) {
      return res.status(400).json({
        success: false,
        message: `Bill already exists for billing period ${normalizedBillingPeriod}`
      });
    }

    // Calculate base amount based on connection type
    let consumption = 0;
    let fixedCharge = 0;
    let consumptionCharge = 0;
    let meterReadingId = null;

    if (waterConnection.isMetered) {
      // Metered connection: consumption-based billing
      // Get meter readings for the billing period
      const [periodYear, periodMonth] = normalizedBillingPeriod.split('-').map(Number);
      const periodStart = new Date(periodYear, periodMonth - 1, 1);
      const periodEnd = new Date(periodYear, periodMonth, 0, 23, 59, 59);

      // Get last reading before period end
      const lastReading = await WaterMeterReading.findOne({
        where: {
          waterConnectionId: normalizedWaterConnectionId,
          readingDate: {
            [Op.lte]: periodEnd
          }
        },
        order: [['readingDate', 'DESC'], ['createdAt', 'DESC']],
        transaction
      });

      // Get first reading of the period (or last reading from previous period)
      const firstReading = await WaterMeterReading.findOne({
        where: {
          waterConnectionId: normalizedWaterConnectionId,
          readingDate: {
            [Op.lt]: periodStart
          }
        },
        order: [['readingDate', 'DESC'], ['createdAt', 'DESC']],
        transaction
      });

      if (lastReading) {
        meterReadingId = lastReading.id;
        const currentReading = parseFloat(lastReading.currentReading) || 0;
        const previousReading = firstReading ? (parseFloat(firstReading.currentReading) || 0) : 0;
        consumption = Math.max(0, currentReading - previousReading);
        
        // Calculate consumption charge (assuming rate per unit - you may need to configure this)
        // For now, using a simple calculation. You can add rate configuration later
        const ratePerUnit = 10; // Default rate - should be configurable
        consumptionCharge = consumption * ratePerUnit;
      } else {
        return res.status(400).json({
          success: false,
          message: 'No meter reading found for the billing period. Please add meter reading first.'
        });
      }
    } else {
      // Non-metered connection: fixed rate billing
      fixedCharge = parseFloat(waterConnection.monthlyRate) || 0;
      if (fixedCharge <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Monthly rate is not set for this non-metered connection'
        });
      }
    }

    // Calculate base amount (fixed charge + consumption charge)
    const baseAmount = fixedCharge + consumptionCharge;

    // Calculate arrears from previous unpaid bills (within transaction for consistency)
    const arrearsAmount = await calculateArrears(normalizedWaterConnectionId, transaction);

    // Calculate total amount (base amount + arrears)
    const totalAmount = baseAmount + arrearsAmount;

    // Set due date (default to 15 days from bill date if not provided)
    const billDate = new Date();
    let dueDateValue = dueDate || due_date;
    if (!dueDateValue) {
      dueDateValue = new Date(billDate);
      dueDateValue.setDate(dueDateValue.getDate() + 15); // 15 days from bill date
    } else {
      dueDateValue = new Date(dueDateValue);
    }

    // Generate unique bill number (WB + ward(3) + serial(4), same format as Property/Connection codes)
    const wardId = waterConnection?.property?.wardId;
    if (!wardId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Property ward not found; cannot generate bill number'
      });
    }
    const billNumber = await generateWaterBillNumber(wardId, transaction);

    // Create water bill
    const waterBill = await WaterBill.create({
      billNumber,
      waterConnectionId: parseInt(normalizedWaterConnectionId),
      meterReadingId,
      billingPeriod: normalizedBillingPeriod,
      consumption,
      fixedCharge,
      consumptionCharge,
      arrearsAmount,
      penaltyAmount: 0,
      interestAmount: 0,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      dueDate: dueDateValue,
      billDate,
      status: WATER_BILL_STATUS.PENDING, // UNPAID status (pending = unpaid)
      generatedBy: req.user?.id || null,
      remarks: remarks || null
    }, { transaction });

    // Fetch created bill with connection details
    const createdBill = await WaterBill.findOne({
      where: { id: waterBill.id },
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status', 'isMetered', 'monthlyRate'],
          include: [
            { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
          ]
        },
        {
          model: WaterMeterReading,
          as: 'meterReading',
          attributes: ['id', 'readingNumber', 'currentReading', 'previousReading', 'consumption', 'readingDate']
        },
        {
          model: User,
          as: 'generator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    // Commit transaction
    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Water bill generated successfully',
      data: { waterBill: createdBill }
    });
  } catch (error) {
    await transaction.rollback();
    
    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Bill number already exists'
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/water-bills
 * @desc    Get all water bills (with filters)
 * @access  Private
 */
export const getAllWaterBills = async (req, res, next) => {
  try {
    const {
      waterConnectionId,
      status,
      billingPeriod,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};

    // Role-based filtering: Citizens see only their own bills
    if (req.user.role === 'citizen') {
      // Get all properties owned by the citizen
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id, isActive: true },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      
      if (propertyIds.length === 0) {
        return res.json({
          success: true,
          data: {
            waterBills: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }
      
      // Get all connections for citizen's properties
      const userConnections = await WaterConnection.findAll({
        where: { propertyId: { [Op.in]: propertyIds } },
        attributes: ['id']
      });
      const connectionIds = userConnections.map(c => c.id);
      
      if (connectionIds.length === 0) {
        return res.json({
          success: true,
          data: {
            waterBills: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }
      
      // Filter bills by citizen's connections
      where.waterConnectionId = { [Op.in]: connectionIds };
    }

    // Apply filters
    if (waterConnectionId) {
      where.waterConnectionId = parseInt(waterConnectionId);
    }
    if (status) {
      where.status = status;
    }
    if (billingPeriod) {
      where.billingPeriod = billingPeriod;
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
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status', 'isMetered'],
          include: [
            { 
              model: Property, 
              as: 'property', 
              attributes: ['id', 'propertyNumber', 'address', 'city']
            }
          ]
        },
        {
          model: WaterMeterReading,
          as: 'meterReading',
          attributes: ['id', 'readingNumber', 'currentReading', 'previousReading', 'consumption']
        },
        {
          model: User,
          as: 'generator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['billingPeriod', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        waterBills: rows,
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
 * @route   GET /api/water-bills/:id
 * @desc    Get water bill by ID
 * @access  Private
 */
export const getWaterBillById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const waterBill = await WaterBill.findOne({
      where: { id },
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status', 'isMetered', 'monthlyRate', 'connectionType'],
          include: [
            {
              model: Property,
              as: 'property',
              attributes: ['id', 'propertyNumber', 'address', 'city', 'wardId'],
              include: [
                { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
              ]
            }
          ]
        },
        {
          model: WaterMeterReading,
          as: 'meterReading',
          attributes: ['id', 'readingNumber', 'currentReading', 'previousReading', 'consumption', 'readingDate']
        },
        {
          model: User,
          as: 'generator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!waterBill) {
      return res.status(404).json({
        success: false,
        message: 'Water bill not found'
      });
    }

    res.json({
      success: true,
      data: { waterBill }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-bills/connection/:waterConnectionId
 * @desc    Get all water bills for a water connection
 * @access  Private
 */
export const getWaterBillsByConnection = async (req, res, next) => {
  try {
    const { waterConnectionId } = req.params;

    // Validate water connection exists
    const waterConnection = await WaterConnection.findOne({
      where: { id: waterConnectionId },
      include: [
        { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
      ]
    });

    if (!waterConnection) {
      return res.status(404).json({
        success: false,
        message: 'Water connection not found'
      });
    }

    const waterBills = await WaterBill.findAll({
      where: { waterConnectionId: parseInt(waterConnectionId) },
      include: [
        {
          model: WaterMeterReading,
          as: 'meterReading',
          attributes: ['id', 'readingNumber', 'currentReading', 'previousReading', 'consumption']
        }
      ],
      order: [['billingPeriod', 'DESC'], ['createdAt', 'DESC']]
    });

    // Calculate total arrears
    const totalArrears = waterBills
      .filter(bill => getUnpaidBillStatuses().includes(bill.status))
      .reduce((sum, bill) => sum + (parseFloat(bill.balanceAmount) || 0), 0);

    res.json({
      success: true,
      data: {
        waterConnection: {
          id: waterConnection.id,
          connectionNumber: waterConnection.connectionNumber,
          meterNumber: waterConnection.meterNumber,
          isMetered: waterConnection.isMetered,
          status: waterConnection.status,
          property: waterConnection.property
        },
        totalArrears,
        waterBills
      }
    });
  } catch (error) {
    next(error);
  }
};
