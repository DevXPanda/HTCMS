import { Payment, Demand, Property, User, Ward, Notice } from '../models/index.js';
import { generateReceiptPdf, generateNoticePdf } from '../services/pdfGenerator.js';
import { getReceiptPdfUrl, getNoticePdfUrl } from '../utils/pdfStorage.js';
import { createAuditLog } from './auditLogger.js';

/**
 * Generate receipt PDF for a payment
 */
export const generatePaymentReceiptPdf = async (paymentId, req, user) => {
  try {
    // Fetch payment with all relations
    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Demand,
          as: 'demand',
          include: [
            {
              model: Property,
              as: 'property',
              include: [
                { model: User, as: 'owner' },
                { model: Ward, as: 'ward' }
              ]
            }
          ]
        },
        { model: Property, as: 'property' },
        { model: User, as: 'cashier' }
      ]
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Check if PDF already exists
    if (payment.receiptPdfUrl) {
      return {
        success: true,
        pdfUrl: payment.receiptPdfUrl,
        alreadyExists: true
      };
    }

    // Generate PDF
    const { filename, filePath } = await generateReceiptPdf(
      payment,
      payment.demand,
      payment.demand.property,
      payment.demand.property.owner,
      payment.demand.property.ward,
      payment.cashier
    );

    // Update payment with PDF URL
    const pdfUrl = getReceiptPdfUrl(filename);
    payment.receiptPdfUrl = pdfUrl;
    payment.receiptGeneratedAt = new Date();
    await payment.save();

    // Log PDF generation
    await createAuditLog({
      req: req || { ip: '127.0.0.1', headers: {} },
      user: user || { id: null, role: 'system', firstName: 'System', lastName: 'PDF Generator' },
      actionType: 'RECEIPT_PDF_GENERATED',
      entityType: 'Payment',
      entityId: payment.id,
      newData: { receiptPdfUrl: pdfUrl, receiptGeneratedAt: payment.receiptGeneratedAt },
      description: `Generated receipt PDF for payment ${payment.paymentNumber}`,
      metadata: { filename, filePath, receiptNumber: payment.receiptNumber }
    });

    return {
      success: true,
      pdfUrl,
      filename,
      filePath
    };
  } catch (error) {
    console.error('Error generating receipt PDF:', error);
    throw error;
  }
};

/**
 * Generate notice PDF
 */
export const generateNoticePdfHelper = async (noticeId, req, user) => {
  try {
    // Fetch notice with all relations
    const notice = await Notice.findByPk(noticeId, {
      include: [
        {
          model: Demand,
          as: 'demand'
        },
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner' },
            { model: Ward, as: 'ward' }
          ]
        },
        { model: User, as: 'owner' },
        { model: User, as: 'generator' }
      ]
    });

    if (!notice) {
      throw new Error('Notice not found');
    }

    // Check if PDF already exists
    if (notice.pdfUrl) {
      return {
        success: true,
        pdfUrl: notice.pdfUrl,
        alreadyExists: true
      };
    }

    // Generate PDF
    const { filename, filePath } = await generateNoticePdf(
      notice,
      notice.demand,
      notice.property,
      notice.owner,
      notice.property.ward,
      notice.generator
    );

    // Update notice with PDF URL
    const pdfUrl = getNoticePdfUrl(filename);
    notice.pdfUrl = pdfUrl;
    notice.pdfGeneratedAt = new Date();
    await notice.save();

    // Log PDF generation
    await createAuditLog({
      req: req || { ip: '127.0.0.1', headers: {} },
      user: user || { id: null, role: 'system', firstName: 'System', lastName: 'PDF Generator' },
      actionType: 'NOTICE_PDF_GENERATED',
      entityType: 'Notice',
      entityId: notice.id,
      newData: { pdfUrl, pdfGeneratedAt: notice.pdfGeneratedAt },
      description: `Generated ${notice.noticeType} notice PDF: ${notice.noticeNumber}`,
      metadata: { filename, filePath, noticeType: notice.noticeType }
    });

    return {
      success: true,
      pdfUrl,
      filename,
      filePath
    };
  } catch (error) {
    console.error('Error generating notice PDF:', error);
    throw error;
  }
};
