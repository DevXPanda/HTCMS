import { WaterPayment, WaterBill, WaterConnection, Property, User } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { WATER_BILL_STATUS, WATER_PAYMENT_STATUS, getUnpaidBillStatuses, isSuccessfulPaymentStatus } from '../constants/waterTaxStatuses.js';

/**
 * Generate unique payment number
 */
const generatePaymentNumber = async () => {
  const year = new Date().getFullYear();
  const count = await WaterPayment.count({
    where: {
      paymentNumber: {
        [Op.like]: `WP-${year}-%`
      }
    }
  });
  const sequence = String(count + 1).padStart(6, '0');
  return `WP-${year}-${sequence}`;
};

/**
 * Generate unique receipt number
 */
const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const count = await WaterPayment.count({
    where: {
      receiptNumber: {
        [Op.like]: `WRCP-${year}-%`
      }
    }
  });
  const sequence = String(count + 1).padStart(6, '0');
  return `WRCP-${year}-${sequence}`;
};

/**
 * @route   POST /api/water-payments
 * @desc    Create new water payment
 * @access  Private
 */
export const createWaterPayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Support both snake_case and camelCase
    const {
      waterBillId,
      water_bill_id,
      amount,
      paymentMode,
      payment_mode,
      paymentDate,
      payment_date,
      chequeNumber,
      cheque_number,
      chequeDate,
      cheque_date,
      bankName,
      bank_name,
      transactionId,
      transaction_id,
      remarks
    } = req.body;

    // Normalize to camelCase
    const normalizedWaterBillId = waterBillId || water_bill_id;
    const normalizedAmount = amount;
    const normalizedPaymentMode = paymentMode || payment_mode || 'cash';
    const normalizedPaymentDate = paymentDate || payment_date;
    const normalizedChequeNumber = chequeNumber || cheque_number;
    const normalizedChequeDate = chequeDate || cheque_date;
    const normalizedBankName = bankName || bank_name;
    const normalizedTransactionId = transactionId || transaction_id;

    // Validate mandatory fields
    const missingFields = [];
    if (!normalizedWaterBillId || normalizedWaterBillId === '' || normalizedWaterBillId === null || normalizedWaterBillId === undefined) {
      missingFields.push('water_bill_id');
    }
    if (!normalizedAmount || normalizedAmount === '' || normalizedAmount === null || normalizedAmount === undefined) {
      missingFields.push('amount');
    }

    if (missingFields.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate payment amount
    const paymentAmount = parseFloat(normalizedAmount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be a valid positive number'
      });
    }

    // Validate payment mode enum
    const validPaymentModes = ['cash', 'cheque', 'dd', 'online', 'card', 'upi'];
    if (!validPaymentModes.includes(normalizedPaymentMode)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid payment_mode. Must be one of: ${validPaymentModes.join(', ')}`
      });
    }

    // Fetch water bill and validate it exists and is UNPAID
    // Use row-level lock to prevent race conditions
    const waterBill = await WaterBill.findOne({
      where: { id: normalizedWaterBillId },
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber', 'status'],
          include: [
            { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
          ]
        }
      ],
      lock: transaction.LOCK.UPDATE, // Row-level lock to prevent concurrent updates
      transaction
    });

    if (!waterBill) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Water bill not found'
      });
    }

    // Validate bill is UNPAID (pending, partially_paid, or overdue)
    if (!getUnpaidBillStatuses().includes(waterBill.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment can only be accepted for UNPAID bills. Current bill status: ${waterBill.status}`
      });
    }

    // Validate payment amount doesn't exceed balance
    const balanceAmount = parseFloat(waterBill.balanceAmount) || 0;
    if (paymentAmount > balanceAmount) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount.toFixed(2)}) cannot exceed balance amount (₹${balanceAmount.toFixed(2)})`
      });
    }

    // Generate payment and receipt numbers
    const paymentNumber = await generatePaymentNumber();
    const receiptNumber = await generateReceiptNumber();

    // Create water payment
    const waterPayment = await WaterPayment.create({
      paymentNumber,
      waterBillId: parseInt(normalizedWaterBillId),
      waterConnectionId: waterBill.waterConnectionId,
      amount: paymentAmount,
      paymentMode: normalizedPaymentMode,
      paymentDate: normalizedPaymentDate ? new Date(normalizedPaymentDate) : new Date(),
      chequeNumber: normalizedChequeNumber || null,
      chequeDate: normalizedChequeDate ? new Date(normalizedChequeDate) : null,
      bankName: normalizedBankName || null,
      transactionId: normalizedTransactionId || null,
      receiptNumber,
      status: WATER_PAYMENT_STATUS.COMPLETED,
      receivedBy: req.user?.id || null,
      remarks: remarks || null
    }, { transaction });

    // Update bill - calculate new paid and balance amounts
    const currentPaidAmount = parseFloat(waterBill.paidAmount) || 0;
    const totalAmount = parseFloat(waterBill.totalAmount) || 0;
    
    const newPaidAmount = Math.round((currentPaidAmount + paymentAmount) * 100) / 100;
    const newBalanceAmount = Math.round((totalAmount - newPaidAmount) * 100) / 100;

    waterBill.paidAmount = newPaidAmount;
    waterBill.balanceAmount = newBalanceAmount;

    // Update bill status based on payment (use epsilon for floating point comparison)
    const EPSILON = 0.01;
    if (Math.abs(newBalanceAmount) < EPSILON) {
      waterBill.status = WATER_BILL_STATUS.PAID;
      waterBill.balanceAmount = 0; // Ensure balance is exactly 0
    } else if (newPaidAmount >= (totalAmount * 0.49) && newPaidAmount <= (totalAmount * 0.51)) {
      // Exactly 50% payment - show as partially_paid
      waterBill.status = WATER_BILL_STATUS.PARTIALLY_PAID;
    }
    // Otherwise keep as pending or overdue (no partially_paid status)

    await waterBill.save({ transaction });

    // Commit transaction
    await transaction.commit();

    // Fetch created payment with bill and connection details
    const createdPayment = await WaterPayment.findOne({
      where: { id: waterPayment.id },
      include: [
        {
          model: WaterBill,
          as: 'waterBill',
          attributes: ['id', 'billNumber', 'billingPeriod', 'totalAmount', 'paidAmount', 'balanceAmount', 'status']
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber'],
          include: [
            { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
          ]
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Water payment processed successfully',
      data: { 
        waterPayment: createdPayment,
        billStatus: waterBill.status,
        remainingBalance: newBalanceAmount
      }
    });
  } catch (error) {
    await transaction.rollback();
    
    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Payment number or receipt number already exists'
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/water-payments
 * @desc    Get all water payments (with filters)
 * @access  Private
 */
export const getAllWaterPayments = async (req, res, next) => {
  try {
    const {
      waterBillId,
      waterConnectionId,
      status,
      paymentMode,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};

    // Apply filters
    if (waterBillId) {
      where.waterBillId = parseInt(waterBillId);
    }
    if (waterConnectionId) {
      where.waterConnectionId = parseInt(waterConnectionId);
    }
    if (status) {
      where.status = status;
    }
    if (paymentMode) {
      where.paymentMode = paymentMode;
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { paymentNumber: { [Op.iLike]: `%${search}%` } },
        { receiptNumber: { [Op.iLike]: `%${search}%` } },
        { transactionId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await WaterPayment.findAndCountAll({
      where,
      include: [
        {
          model: WaterBill,
          as: 'waterBill',
          attributes: ['id', 'billNumber', 'billingPeriod', 'totalAmount', 'status']
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber'],
          include: [
            { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address', 'city'] }
          ]
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        waterPayments: rows,
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
 * @route   GET /api/water-payments/:id
 * @desc    Get water payment by ID
 * @access  Private
 */
export const getWaterPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const waterPayment = await WaterPayment.findOne({
      where: { id },
      include: [
        {
          model: WaterBill,
          as: 'waterBill',
          attributes: ['id', 'billNumber', 'billingPeriod', 'totalAmount', 'paidAmount', 'balanceAmount', 'status'],
          include: [
            {
              model: WaterConnection,
              as: 'waterConnection',
              attributes: ['id', 'connectionNumber', 'meterNumber'],
              include: [
                { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
              ]
            }
          ]
        },
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber'],
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
          model: User,
          as: 'cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!waterPayment) {
      return res.status(404).json({
        success: false,
        message: 'Water payment not found'
      });
    }

    res.json({
      success: true,
      data: { waterPayment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-payments/bill/:waterBillId
 * @desc    Get all payments for a water bill
 * @access  Private
 */
export const getWaterPaymentsByBill = async (req, res, next) => {
  try {
    const { waterBillId } = req.params;

    // Validate water bill exists
    const waterBill = await WaterBill.findOne({
      where: { id: waterBillId },
      include: [
        {
          model: WaterConnection,
          as: 'waterConnection',
          attributes: ['id', 'connectionNumber', 'meterNumber'],
          include: [
            { model: Property, as: 'property', attributes: ['id', 'propertyNumber', 'address'] }
          ]
        }
      ]
    });

    if (!waterBill) {
      return res.status(404).json({
        success: false,
        message: 'Water bill not found'
      });
    }

    const waterPayments = await WaterPayment.findAll({
      where: { waterBillId: parseInt(waterBillId) },
      include: [
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']]
    });

    // Calculate total paid amount from payments
    const totalPaidFromPayments = waterPayments
      .filter(payment => isSuccessfulPaymentStatus(payment.status))
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

    res.json({
      success: true,
      data: {
        waterBill: {
          id: waterBill.id,
          billNumber: waterBill.billNumber,
          billingPeriod: waterBill.billingPeriod,
          totalAmount: waterBill.totalAmount,
          paidAmount: waterBill.paidAmount,
          balanceAmount: waterBill.balanceAmount,
          status: waterBill.status,
          waterConnection: waterBill.waterConnection
        },
        totalPaidFromPayments,
        waterPayments
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/water-payments/connection/:waterConnectionId
 * @desc    Get all payments for a water connection
 * @access  Private
 */
export const getWaterPaymentsByConnection = async (req, res, next) => {
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

    const waterPayments = await WaterPayment.findAll({
      where: { waterConnectionId: parseInt(waterConnectionId) },
      include: [
        {
          model: WaterBill,
          as: 'waterBill',
          attributes: ['id', 'billNumber', 'billingPeriod', 'totalAmount', 'status']
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']]
    });

    // Calculate total payments
    const totalPayments = waterPayments
      .filter(payment => isSuccessfulPaymentStatus(payment.status))
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

    res.json({
      success: true,
      data: {
        waterConnection: {
          id: waterConnection.id,
          connectionNumber: waterConnection.connectionNumber,
          meterNumber: waterConnection.meterNumber,
          property: waterConnection.property
        },
        totalPayments,
        waterPayments
      }
    });
  } catch (error) {
    next(error);
  }
};
