import { Payment, Demand, Property, User, Ward, Assessment } from '../models/index.js';
import { Op } from 'sequelize';
import { razorpay } from '../config/razorpay.js';
import crypto from 'crypto';
import { updateNoticeOnPayment } from './notice.controller.js';
import { generatePaymentReceiptPdf } from '../utils/pdfHelpers.js';
import { auditLogger, createAuditLog } from '../utils/auditLogger.js';

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
      include: [{ model: Property, as: 'property' }]
    });

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Demand not found'
      });
    }

    // Validate payment amount
    if (amount > demand.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed balance amount'
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
      amount,
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

    // Update demand
    const newPaidAmount = demand.paidAmount + amount;
    const newBalanceAmount = demand.totalAmount - newPaidAmount;

    demand.paidAmount = newPaidAmount;
    demand.balanceAmount = newBalanceAmount;

    // Update demand status
    if (newBalanceAmount <= 0) {
      demand.status = 'paid';
    } else if (newPaidAmount > 0) {
      demand.status = 'partially_paid';
    }

    await demand.save();

    // Update notice status if demand is paid
    await updateNoticeOnPayment(demandId, req, req.user);

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
        message: 'Demand not found'
      });
    }

    // Validate payment amount
    if (amount > demand.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed balance amount'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    // Convert amount to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

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
      amount,
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

    // Update demand
    const demand = payment.demand;
    const newPaidAmount = parseFloat(demand.paidAmount || 0) + parseFloat(payment.amount);
    const newBalanceAmount = parseFloat(demand.totalAmount || 0) - newPaidAmount;

    demand.paidAmount = newPaidAmount;
    demand.balanceAmount = newBalanceAmount;

    // Update demand status
    if (newBalanceAmount <= 0) {
      demand.status = 'paid';
    } else if (newPaidAmount > 0) {
      demand.status = 'partially_paid';
    }

    await demand.save();

    // Update notice status if demand is paid
    await updateNoticeOnPayment(demand.id, req, req.user);

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
