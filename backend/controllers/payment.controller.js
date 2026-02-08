import { Payment, Demand, Property, User, Ward, Assessment, FollowUp } from '../models/index.js';
import { Op } from 'sequelize';
import { razorpay } from '../config/razorpay.js';
import crypto from 'crypto';
import { updateNoticeOnPayment } from './notice.controller.js';
import { generatePaymentReceiptPdf } from '../utils/pdfHelpers.js';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';
import { distributePaymentAcrossItems, validatePaymentDistributionIntegrity } from '../services/paymentService.js';
import { validateAuditAction } from '../utils/auditHelpers.js';

/**
 * Validate payment amount against demand balance to prevent overpayment
 * @param {number} paymentAmount - Payment amount being processed
 * @param {number} balanceAmount - Current demand balance amount
 * @param {string} demandNumber - Demand number for error message context
 * @returns {Object} Validation result
 */
const validateOverpaymentProtection = (paymentAmount, balanceAmount, demandNumber = null) => {
  // Ensure amounts are proper numbers
  const payment = parseFloat(paymentAmount || 0);
  const balance = parseFloat(balanceAmount || 0);

  // Check for negative or zero amounts
  if (payment <= 0) {
    return {
      isValid: false,
      error: 'Payment amount must be greater than 0',
      errorCode: 'INVALID_AMOUNT'
    };
  }

  // Check for overpayment
  if (payment > balance) {
    const context = demandNumber ? ` for demand ${demandNumber}` : '';
    return {
      isValid: false,
      error: `Overpayment detected${context}. Payment amount (₹${payment.toFixed(2)}) cannot exceed balance amount (₹${balance.toFixed(2)}).`,
      errorCode: 'OVERPAYMENT',
      details: {
        paymentAmount: payment,
        balanceAmount: balance,
        excessAmount: payment - balance
      }
    };
  }

  // Check for exact payment match (optional warning)
  if (Math.abs(payment - balance) < 0.01) {
    return {
      isValid: true,
      warning: 'Payment amount exactly matches the balance. This will fully settle the demand.',
      paymentAmount: payment,
      balanceAmount: balance
    };
  }

  return {
    isValid: true,
    paymentAmount: payment,
    balanceAmount: balance
  };
};

/**
 * @route   GET /api/payments
 * @desc    Get all payments (with filters)
 * @access  Private
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const {
      demandId,
      propertyId,
      paymentMode,
      status,
      startDate,
      endDate,
      search,
      minAmount,
      maxAmount,
      page = 1,
      limit = 10
    } = req.query;

    const where = {};

    if (demandId) where.demandId = demandId;
    if (propertyId) where.propertyId = propertyId;
    if (paymentMode) where.paymentMode = paymentMode;
    if (status) where.status = status;

    // Search by payment number or receipt number
    if (search) {
      where[Op.or] = [
        { paymentNumber: { [Op.iLike]: `%${search}%` } },
        { receiptNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount[Op.gte] = parseFloat(minAmount);
      if (maxAmount) where.amount[Op.lte] = parseFloat(maxAmount);
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) where.paymentDate[Op.lte] = new Date(endDate);
    }

    // For citizens, show only payments of their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    // For cashiers, show only their received payments
    if (req.user.role === 'cashier') {
      where.receivedBy = req.user.id;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Demand, as: 'demand' },
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset,
      order: [['paymentDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        payments: rows,
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
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: { exclude: ['password'] } }
          ]
        },
        {
          model: Demand,
          as: 'demand',
          include: [
            { model: Assessment, as: 'assessment' }
          ]
        },
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check access for citizens
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(payment.propertyId);
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/payments
 * @desc    Create new payment (offline)
 * @access  Private (Cashier, Admin)
 */
export const createPayment = async (req, res, next) => {
  try {
    const {
      demandId,
      amount,
      paymentMode,
      paymentDate,
      chequeNumber,
      chequeDate,
      bankName,
      transactionId,
      remarks
    } = req.body;

    // Get demand
    const demand = await Demand.findByPk(demandId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [{ model: Ward, as: 'ward' }]
        }
      ]
    });

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    // Verify collector has access to this property's ward
    if (req.user.role === 'collector') {
      const hasAccess = await verifyCollectorWardAccess(req.user.id, demand.property.wardId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to this ward'
        });
      }
    }

    // Ensure all amounts are proper numbers
    const paymentAmount = parseFloat(amount);
    const balanceAmount = parseFloat(demand.balanceAmount || 0);
    const totalAmount = parseFloat(demand.totalAmount || 0);
    const paidAmount = parseFloat(demand.paidAmount || 0);
    const baseAmount = parseFloat(demand.baseAmount || 0);
    const arrearsAmount = parseFloat(demand.arrearsAmount || 0);
    const penaltyAmount = parseFloat(demand.penaltyAmount || 0);
    const interestAmount = parseFloat(demand.interestAmount || 0);

    // Enhanced overpayment protection validation
    const validation = validateOverpaymentProtection(
      paymentAmount,
      balanceAmount,
      demand.demandNumber
    );

    if (!validation.isValid) {
      // Log overpayment attempt for security
      await createAuditLog({
        req,
        user: req.user,
        actionType: 'OVERPAYMENT_ATTEMPT',
        entityType: 'Payment',
        entityId: null,
        description: `Overpayment attempt blocked: ${validation.error}`,
        metadata: {
          demandId,
          demandNumber: demand.demandNumber,
          attemptedAmount: paymentAmount,
          balanceAmount: balanceAmount,
          excessAmount: validation.details?.excessAmount || 0,
          paymentMode: paymentMode || 'cash',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });

      return res.status(400).json({
        success: false,
        message: validation.error,
        errorCode: validation.errorCode,
        details: validation.details || null
      });
    }

    // Generate payment number
    const paymentNumber = `PAY-${Date.now()}`;

    // Generate receipt number
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now()}`;

    // Create payment
    const payment = await Payment.create({
      paymentNumber,
      demandId,
      propertyId: demand.propertyId,
      amount: paymentAmount,
      paymentMode: paymentMode || 'cash',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      chequeNumber,
      chequeDate: chequeDate ? new Date(chequeDate) : null,
      bankName,
      transactionId,
      receiptNumber,
      status: 'completed',
      receivedBy: req.user.id,
      remarks
    });

    // Distribute payment across demand items (item-level payment tracking)
    const distributionResult = await distributePaymentAcrossItems(demandId, paymentAmount, null);

    // Refresh demand data after distribution
    await demand.reload();

    // Log payment distribution for audit
    await createAuditLog({
      req,
      user: req.user,
      actionType: validateAuditAction('PAYMENT_DISTRIBUTION'),
      entityType: 'Payment',
      entityId: payment.id,
      description: `Payment distributed across demand items: ${payment.paymentNumber}`,
      metadata: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        demandId,
        paymentAmount,
        distributionSummary: distributionResult.summary
      }
    });

    // Validate payment distribution integrity
    const distributionValidation = await validatePaymentDistributionIntegrity(demandId);
    if (!distributionValidation.isValid) {
      console.error('Payment distribution validation failed:', distributionValidation.issues);
      // Don't fail the payment, but log for investigation
      await createAuditLog({
        req,
        user: req.user,
        actionType: 'PAYMENT_DISTRIBUTION_VALIDATION_FAILED',
        entityType: 'Payment',
        entityId: payment.id,
        description: `Payment distribution validation failed for ${payment.paymentNumber}`,
        metadata: {
          paymentId: payment.id,
          demandId,
          issues: distributionValidation.issues
        }
      });
    }

    // Update notice status if demand is paid
    await updateNoticeOnPayment(demandId, req, req.user);

    // Auto-close follow-up if demand is fully paid
    if (demand.balanceAmount <= 0) {
      const followUp = await FollowUp.findOne({
        where: { demandId }
      });

      if (followUp && !followUp.isResolved) {
        await followUp.update({
          isResolved: true,
          resolvedDate: new Date(),
          resolvedBy: req.user.id
        });

        // Create audit log for follow-up resolution
        await createAuditLog({
          req,
          user: req.user,
          actionType: 'RESOLVE',
          entityType: 'FollowUp',
          entityId: followUp.id,
          description: `Follow-up resolved automatically after payment. Payment: ${payment.paymentNumber}`,
          metadata: {
            followUpId: followUp.id,
            demandId,
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: payment.amount
          }
        });
      }
    }

    const createdPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Demand, as: 'demand' },
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    // Log payment creation
    await auditLogger.logPay(
      req,
      req.user,
      'Payment',
      payment.id,
      { paymentNumber: payment.paymentNumber, amount: payment.amount, paymentMode: payment.paymentMode, receiptNumber: payment.receiptNumber },
      `Processed payment: ${payment.paymentNumber} - ₹${payment.amount}`,
      { demandId: payment.demandId, propertyId: payment.propertyId }
    );

    // Generate receipt PDF automatically after successful payment
    try {
      await generatePaymentReceiptPdf(payment.id, req, req.user);
    } catch (pdfError) {
      console.error('Error generating receipt PDF:', pdfError);
      // Don't fail the payment if PDF generation fails
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment: createdPayment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/payments/receipt/:receiptNumber
 * @desc    Get payment receipt by receipt number
 * @access  Private
 */
export const getPaymentReceipt = async (req, res, next) => {
  try {
    const { receiptNumber } = req.params;

    const payment = await Payment.findOne({
      where: { receiptNumber },
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: { exclude: ['password'] } },
            { model: Ward, as: 'ward' }
          ]
        },
        {
          model: Demand,
          as: 'demand',
          include: [
            { model: Assessment, as: 'assessment' }
          ]
        },
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Check access for citizens
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(payment.propertyId);
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/payments/statistics/summary
 * @desc    Get payment statistics summary
 * @access  Private (Admin, Cashier)
 */
export const getPaymentStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate, paymentMode } = req.query;

    const where = { status: 'completed' };

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) where.paymentDate[Op.lte] = new Date(endDate);
    }

    if (paymentMode) where.paymentMode = paymentMode;

    // For cashiers, filter by their payments
    if (req.user.role === 'cashier') {
      where.receivedBy = req.user.id;
    }

    const payments = await Payment.findAll({ where });

    const statistics = {
      total: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
      byMode: {
        cash: payments.filter(p => p.paymentMode === 'cash').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        cheque: payments.filter(p => p.paymentMode === 'cheque').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        dd: payments.filter(p => p.paymentMode === 'dd').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        online: payments.filter(p => p.paymentMode === 'online').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        card: payments.filter(p => p.paymentMode === 'card').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
      },
      byDate: payments.reduce((acc, payment) => {
        const date = new Date(payment.paymentDate).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + parseFloat(payment.amount || 0);
        return acc;
      }, {})
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
 * @route   GET /api/payments/demand/:demandId
 * @desc    Get all payments for a demand
 * @access  Private
 */
export const getPaymentsByDemand = async (req, res, next) => {
  try {
    const { demandId } = req.params;

    const payments = await Payment.findAll({
      where: { demandId, status: 'completed' },
      include: [
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
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

/**
 * @route   POST /api/payments/online/create-order
 * @desc    Create Razorpay order for online payment
 * @access  Private
 */
export const createOnlinePaymentOrder = async (req, res, next) => {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Online payment is not configured. Please contact administrator.'
      });
    }

    const { demandId, amount } = req.body;

    // Get demand
    const demand = await Demand.findByPk(demandId, {
      include: [{ model: Property, as: 'property' }]
    });

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    // Enhanced overpayment protection validation for online payments
    // Ensure amounts are proper numbers
    const paymentAmount = parseFloat(amount);
    const balanceAmount = parseFloat(demand.balanceAmount || 0);

    const validation = validateOverpaymentProtection(
      paymentAmount,
      balanceAmount,
      demand.demandNumber
    );

    if (!validation.isValid) {
      // Log overpayment attempt for security
      await createAuditLog({
        req,
        user: req.user,
        actionType: 'OVERPAYMENT_ATTEMPT',
        entityType: 'Payment',
        entityId: null,
        description: `Online overpayment attempt blocked: ${validation.error}`,
        metadata: {
          demandId,
          demandNumber: demand.demandNumber,
          attemptedAmount: paymentAmount,
          balanceAmount: balanceAmount,
          excessAmount: validation.details?.excessAmount || 0,
          paymentMode: 'online',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });

      return res.status(400).json({
        success: false,
        message: validation.error,
        errorCode: validation.errorCode,
        details: validation.details || null
      });
    }

    // Convert amount to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(paymentAmount * 100);

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `DEM-${demandId}-${Date.now()}`,
      notes: {
        demandId: demandId.toString(),
        propertyId: demand.propertyId.toString(),
        demandNumber: demand.demandNumber,
        propertyNumber: demand.property?.propertyNumber || '',
        userId: req.user.id.toString()
      }
    };

    const order = await razorpay.orders.create(options);

    // Create pending payment record
    const paymentNumber = `PAY-${Date.now()}`;
    const payment = await Payment.create({
      paymentNumber,
      demandId,
      propertyId: demand.propertyId,
      amount: paymentAmount,
      paymentMode: 'online',
      paymentDate: new Date(),
      razorpayOrderId: order.id,
      status: 'pending',
      receivedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentId: payment.id,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/payments/online/verify
 * @desc    Verify and complete online payment
 * @access  Private
 */
export const verifyOnlinePayment = async (req, res, next) => {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Online payment is not configured. Please contact administrator.'
      });
    }

    const { paymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Get payment record
    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Demand, as: 'demand' }]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Payment is already ${payment.status}`
      });
    }

    // Verify Razorpay signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(503).json({
        success: false,
        message: 'Payment verification failed: Razorpay not configured'
      });
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      // Mark payment as failed
      payment.status = 'failed';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature'
      });
    }

    // Verify payment with Razorpay
    try {
      const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);

      if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
        payment.status = 'failed';
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.razorpaySignature = razorpaySignature;
        await payment.save();

        return res.status(400).json({
          success: false,
          message: `Payment not captured. Status: ${razorpayPayment.status}`
        });
      }
    } catch (razorpayError) {
      console.error('Razorpay payment fetch error:', razorpayError);
      payment.status = 'failed';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Failed to verify payment with Razorpay'
      });
    }

    // Payment verified successfully - update payment record
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Date.now()}`;
    payment.status = 'completed';
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.transactionId = razorpayPaymentId;
    payment.receiptNumber = receiptNumber;
    await payment.save();

    // Update demand using item-level payment distribution
    const distributionResult = await distributePaymentAcrossItems(demand.id, parseFloat(payment.amount || 0), null);

    // Refresh demand data after distribution
    await demand.reload();

    // Update notice status if demand is paid
    await updateNoticeOnPayment(demand.id, req, req.user);

    // Auto-close follow-up if demand is fully paid
    if (demand.balanceAmount <= 0) {
      const followUp = await FollowUp.findOne({
        where: { demandId: demand.id }
      });

      if (followUp && !followUp.isResolved) {
        await followUp.update({
          isResolved: true,
          resolvedDate: new Date(),
          resolvedBy: req.user.id
        });

        // Create audit log for follow-up resolution
        await createAuditLog({
          req,
          user: req.user,
          actionType: 'RESOLVE',
          entityType: 'FollowUp',
          entityId: followUp.id,
          description: `Follow-up resolved automatically after online payment. Payment: ${payment.paymentNumber}`,
          metadata: {
            followUpId: followUp.id,
            demandId: demand.id,
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            paymentMode: 'online'
          }
        });
      }
    }

    // Log online payment completion
    await auditLogger.logPay(
      req,
      req.user,
      'Payment',
      payment.id,
      { paymentNumber: payment.paymentNumber, amount: payment.amount, paymentMode: 'online', receiptNumber: payment.receiptNumber, razorpayPaymentId: payment.razorpayPaymentId },
      `Completed online payment: ${payment.paymentNumber} - ₹${payment.amount}`,
      { demandId: payment.demandId, propertyId: payment.propertyId }
    );

    // Generate receipt PDF automatically after successful payment
    try {
      await generatePaymentReceiptPdf(payment.id, req, req.user);
    } catch (pdfError) {
      console.error('Error generating receipt PDF:', pdfError);
      // Don't fail the payment if PDF generation fails
    }

    // Fetch complete payment details
    const completedPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Demand, as: 'demand' },
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    res.json({
      success: true,
      message: 'Payment verified and completed successfully',
      data: { payment: completedPayment }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/payments/:id/generate-receipt
 * @desc    Generate receipt PDF for a payment
 * @access  Private (Admin, Cashier, Citizen - own payments only)
 */
export const generateReceiptPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByPk(id, {
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demand' }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check access - Citizens can only generate receipts for their own payments
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(payment.propertyId);
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only generate receipts for your own payments.'
        });
      }
    }

    // Check if PDF already exists
    if (payment.receiptPdfUrl) {
      return res.json({
        success: true,
        message: 'Receipt PDF already generated',
        data: { pdfUrl: payment.receiptPdfUrl }
      });
    }

    // Generate PDF
    const result = await generatePaymentReceiptPdf(payment.id, req, req.user);

    res.json({
      success: true,
      message: 'Receipt PDF generated successfully',
      data: { pdfUrl: result.pdfUrl }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/payments/field-collection
 * @desc    Create field collection payment (Collector Portal)
 * @access  Private (Collector, Tax Collector)
 */
export const createFieldCollectionPayment = async (req, res, next) => {
  try {
    const {
      demandId,
      amount,
      paymentMode,
      paymentDate,
      chequeNumber,
      chequeDate,
      bankName,
      transactionId,
      proofUrl,
      remarks
    } = req.body;

    // Get demand with property details
    const demand = await Demand.findByPk(demandId, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: Ward, as: 'ward' }
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

    // Verify collector has access to this property's ward
    const user = req.user;
    if (user.role === 'collector' || user.role === 'tax_collector') {
      // Check if collector is assigned to this ward
      const hasAccess = await verifyCollectorWardAccess(user.id, demand.property.wardId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not assigned to this ward'
        });
      }
    }

    // Ensure all amounts are proper numbers
    const paymentAmount = parseFloat(amount);
    const balanceAmount = parseFloat(demand.balanceAmount || 0);

    // Enhanced overpayment protection validation
    const validation = validateOverpaymentProtection(
      paymentAmount,
      balanceAmount,
      demand.demandNumber
    );

    if (!validation.isValid) {
      // Log overpayment attempt for security
      await createAuditLog({
        req,
        user: req.user,
        actionType: 'OVERPAYMENT_ATTEMPT',
        entityType: 'Payment',
        entityId: null,
        description: `Field collection overpayment attempt blocked: ${validation.error}`,
        metadata: {
          demandId,
          demandNumber: demand.demandNumber,
          attemptedAmount: paymentAmount,
          balanceAmount: balanceAmount,
          excessAmount: validation.details?.excessAmount || 0,
          paymentMode: paymentMode || 'cash',
          collectionType: 'field',
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });

      return res.status(400).json({
        success: false,
        message: validation.error,
        errorCode: validation.errorCode,
        details: validation.details || null
      });
    }

    // For offline payments, proof is mandatory
    if (paymentMode !== 'online' && !proofUrl) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof is mandatory for offline payment modes'
      });
    }

    // Generate payment number
    const paymentNumber = `FC-${Date.now()}`; // FC for Field Collection

    // Generate receipt number
    const receiptNumber = `FCR-${new Date().getFullYear()}-${Date.now()}`; // FCR for Field Collection Receipt

    // Create payment
    const payment = await Payment.create({
      paymentNumber,
      demandId,
      propertyId: demand.propertyId,
      amount: paymentAmount,
      paymentMode: paymentMode || 'cash',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      chequeNumber,
      chequeDate: chequeDate ? new Date(chequeDate) : null,
      bankName,
      transactionId,
      receiptNumber,
      status: 'completed',
      receivedBy: user.id, // For backward compatibility
      collectedBy: user.id, // New field for field collections
      proofUrl,
      remarks: remarks || `Field collection by ${user.firstName} ${user.lastName}`
    });

    // Distribute payment across demand items (item-level payment tracking)
    const distributionResult = await distributePaymentAcrossItems(demandId, paymentAmount, null);

    // Refresh demand data after distribution
    await demand.reload();

    // Log payment distribution for audit
    await createAuditLog({
      req,
      user: req.user,
      actionType: validateAuditAction('PAYMENT_DISTRIBUTION'),
      entityType: 'Payment',
      entityId: payment.id,
      description: `Field collection payment distributed across demand items: ${payment.paymentNumber}`,
      metadata: {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
        demandId,
        paymentAmount,
        collectionType: 'field',
        distributionSummary: distributionResult.summary
      }
    });

    // Validate payment distribution integrity
    const distributionValidation = await validatePaymentDistributionIntegrity(demandId);
    if (!distributionValidation.isValid) {
      console.error('Payment distribution validation failed:', distributionValidation.issues);
      // Don't fail the payment, but log for investigation
      await createAuditLog({
        req,
        user: req.user,
        actionType: validateAuditAction('PAYMENT_DISTRIBUTION_VALIDATION_FAILED'),
        entityType: 'Payment',
        entityId: payment.id,
        description: `Payment distribution validation failed for ${payment.paymentNumber}`,
        metadata: {
          paymentId: payment.id,
          demandId,
          collectionType: 'online',
          issues: distributionValidation.issues
        }
      });
    }

    // Update notice status if demand is paid
    await updateNoticeOnPayment(demandId, req, req.user);

    // Auto-close follow-up if demand is fully paid
    if (demand.balanceAmount <= 0) {
      const followUp = await FollowUp.findOne({
        where: { demandId }
      });

      if (followUp && !followUp.isResolved) {
        await followUp.update({
          isResolved: true,
          resolvedDate: new Date(),
          resolvedBy: req.user.id
        });

        // Create audit log for follow-up resolution
        await createAuditLog({
          req,
          user: req.user,
          actionType: 'RESOLVE',
          entityType: 'FollowUp',
          entityId: followUp.id,
          description: `Follow-up resolved automatically after field collection payment. Payment: ${payment.paymentNumber}`,
          metadata: {
            followUpId: followUp.id,
            demandId,
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            collectionType: 'field'
          }
        });
      }
    }

    const createdPayment = await Payment.findByPk(payment.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
          ]
        },
        { model: Demand, as: 'demand' },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'collector',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    // Log field collection payment creation
    await auditLogger.logPay(
      req,
      req.user,
      'Payment',
      payment.id,
      {
        paymentNumber: payment.paymentNumber,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        receiptNumber: payment.receiptNumber,
        collectionType: 'field',
        proofUrl: payment.proofUrl
      },
      `Field collection payment processed: ${payment.paymentNumber} - ₹${payment.amount}`,
      { demandId: payment.demandId, propertyId: payment.propertyId }
    );

    // Generate receipt PDF automatically after successful payment
    try {
      await generatePaymentReceiptPdf(payment.id, req, req.user);
    } catch (pdfError) {
      console.error('Error generating receipt PDF:', pdfError);
      // Don't fail the payment if PDF generation fails
    }

    res.status(201).json({
      success: true,
      message: 'Field collection payment recorded successfully',
      data: { payment: createdPayment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify collector has access to the specified ward
 */
const verifyCollectorWardAccess = async (collectorId, wardId) => {
  try {
    // Check if collector is assigned to this ward
    const ward = await Ward.findOne({
      where: {
        id: wardId,
        collectorId: collectorId
      }
    });

    return !!ward;
  } catch (error) {
    console.error('Error verifying collector ward access:', error);
    return false;
  }
};

/**
 * @route   GET /api/payments/receipts/:filename
 * @desc    Download receipt PDF
 * @access  Private (Role-based access enforced)
 */
export const downloadReceiptPdf = async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Extract payment ID from filename (format: RECEIPT_<id>_<timestamp>_<random>.pdf)
    const match = filename.match(/RECEIPT_(\d+)_/);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt filename'
      });
    }

    const paymentId = parseInt(match[1]);

    // Fetch payment with relations
    const payment = await Payment.findByPk(paymentId, {
      include: [
        { model: Property, as: 'property' },
        { model: Demand, as: 'demand' }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check access - Citizens can only download their own receipts
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(payment.propertyId);
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Check if PDF exists
    if (!payment.receiptPdfUrl) {
      return res.status(404).json({
        success: false,
        message: 'Receipt PDF not generated yet'
      });
    }

    // Verify filename matches
    if (!payment.receiptPdfUrl.includes(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receipt filename'
      });
    }

    // Read and send PDF file
    const { readPdfFile, getReceiptPdfPath } = await import('../utils/pdfStorage.js');
    const filePath = getReceiptPdfPath(filename);

    try {
      const pdfBuffer = await readPdfFile(filePath);

      // Log PDF download
      await createAuditLog({
        req,
        user: req.user,
        actionType: 'RECEIPT_PDF_DOWNLOADED',
        entityType: 'Payment',
        entityId: payment.id,
        description: `Downloaded receipt PDF for payment ${payment.paymentNumber}`,
        metadata: { filename }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="receipt_${payment.receiptNumber || payment.paymentNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (fileError) {
      return res.status(404).json({
        success: false,
        message: 'Receipt PDF file not found'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Export the validation function for testing and external use
export { validateOverpaymentProtection };
