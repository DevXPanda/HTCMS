import PDFDocument from 'pdfkit';
import {
  generatePdfFilename,
  getReceiptPdfPath,
  getNoticePdfPath,
  savePdfFile
} from '../utils/pdfStorage.js';
import { getDemandOriginalAmount, getDemandPenaltyAmount, calculateFinalAmount } from '../utils/financialCalculations.js';

/**
 * PDF Generation Service
 * Generates PDFs for payment receipts and notices
 */

// Shared receipt layout constants
const RECEIPT_MARGIN = 50;
const RECEIPT_WIDTH = 495;
const RECEIPT_LEFT = 50;
const RECEIPT_LABEL_LEFT = 60;
const RECEIPT_VALUE_RIGHT = 535;
const ROW_HEIGHT = 22;

/** Draw a bordered section with title and label-value rows; returns Y after box */
function drawReceiptSection(doc, startY, title, rows) {
  const titleHeight = 20;
  const rowCount = rows.length;
  const boxHeight = titleHeight + rowCount * ROW_HEIGHT + 10;
  doc.rect(RECEIPT_LEFT, startY, RECEIPT_WIDTH, boxHeight).stroke();
  doc.fontSize(12).font('Helvetica-Bold').text(title, RECEIPT_LABEL_LEFT, startY + 10);
  let y = startY + titleHeight + 5;
  doc.fontSize(10);
  for (const [label, value] of rows) {
    doc.font('Helvetica-Bold').text(label, RECEIPT_LABEL_LEFT, y);
    doc.font('Helvetica').text(String(value || 'N/A'), RECEIPT_LABEL_LEFT, y, { width: RECEIPT_VALUE_RIGHT - RECEIPT_LABEL_LEFT - 10, align: 'right' });
    y += ROW_HEIGHT;
  }
  return startY + boxHeight + 12;
}

/**
 * Generate Payment Receipt PDF
 * Unified structure: header, receipt details, property, owner, payment details, footer
 */
export const generateReceiptPdf = async (payment, demand, property, owner, ward, cashier) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const filename = generatePdfFilename('RECEIPT', payment.id);
          const filePath = getReceiptPdfPath(filename);
          await savePdfFile(pdfBuffer, filePath);
          resolve({ filename, filePath, buffer: pdfBuffer });
        } catch (error) {
          reject(error);
        }
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
        .text('MUNICIPAL CORPORATION', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica')
        .text('House Tax Collection & Management System', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(18).font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(1.5);

      let y = doc.y;

      // Receipt Details
      const paymentDateStr = new Date(payment.paymentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
      const locationStr = ward ? `${ward.wardNumber} - ${ward.wardName}` : 'N/A';
      y = drawReceiptSection(doc, y, 'Receipt Details', [
        ['Receipt Number', payment.receiptNumber || payment.paymentNumber],
        ['Payment Date', paymentDateStr],
        ['Payment ID', payment.paymentNumber || payment.id],
        ['Location', locationStr]
      ]);

      // Property Details
      const addressStr = [property.address, property.city, property.state, property.pincode].filter(Boolean).join(', ');
      y = drawReceiptSection(doc, y, 'Property Details', [
        ['Property Number', property.propertyNumber],
        ['Address', addressStr || 'N/A']
      ]);

      // Owner Details
      const ownerName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : 'N/A';
      y = drawReceiptSection(doc, y, 'Owner Details', [
        ['Name', ownerName],
        ['Email', owner?.email],
        ['Phone', owner?.phone]
      ]);

      // Payment Details (amounts right-aligned in section)
      const amountPaid = `₹${parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      const totalPaid = amountPaid;
      const paymentDetailRows = [
        ['Financial Year', demand?.financialYear],
        ['Demand Number', demand?.demandNumber || 'N/A'],
        ['Payment Mode', (payment.paymentMode || '').toUpperCase()],
        ['Amount Paid', amountPaid],
        ['Total Paid', totalPaid]
      ];
      if (payment.paymentMode === 'cheque' || payment.paymentMode === 'dd') {
        paymentDetailRows.splice(3, 0, ['Cheque/DD Number', payment.chequeNumber]);
        if (payment.bankName) paymentDetailRows.push(['Bank Name', payment.bankName]);
      }
      if (payment.transactionId) {
        paymentDetailRows.push(['Transaction ID', payment.transactionId]);
      }
      const paymentBoxH = 20 + paymentDetailRows.length * ROW_HEIGHT + 10;
      doc.rect(RECEIPT_LEFT, y, RECEIPT_WIDTH, paymentBoxH).stroke();
      doc.fontSize(12).font('Helvetica-Bold').text('Payment Details', RECEIPT_LABEL_LEFT, y + 10);
      let py = y + 35;
      doc.fontSize(10);
      for (const [label, value] of paymentDetailRows) {
        doc.font('Helvetica-Bold').text(label, RECEIPT_LABEL_LEFT, py);
        doc.font('Helvetica').text(String(value || 'N/A'), RECEIPT_LABEL_LEFT, py, { width: RECEIPT_VALUE_RIGHT - RECEIPT_LABEL_LEFT - 10, align: 'right' });
        py += ROW_HEIGHT;
      }
      y = y + paymentBoxH + 12;

      if (cashier) {
        doc.fontSize(10).font('Helvetica-Bold').text('Received By:', RECEIPT_LABEL_LEFT, y);
        doc.font('Helvetica').text(`${cashier.firstName || ''} ${cashier.lastName || ''}`.trim(), 200, y);
        y += ROW_HEIGHT + 8;
      }

      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Oblique')
        .text('This is a system-generated receipt. No signature required. Valid only if payment is successful and confirmed.', { align: 'center' });
      doc.fontSize(8).font('Helvetica')
        .text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Notice PDF
 */
export const generateNoticePdf = async (notice, demand, property, owner, ward, generator) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const filename = generatePdfFilename('NOTICE', notice.id);
          const filePath = getNoticePdfPath(filename);
          await savePdfFile(pdfBuffer, filePath);
          resolve({ filename, filePath, buffer: pdfBuffer });
        } catch (error) {
          reject(error);
        }
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
         .text('MUNICIPAL CORPORATION', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica')
         .text('House Tax Collection & Management System', { align: 'center' });
      doc.moveDown(1);
      
      // Notice Type Title
      const noticeTypeTitles = {
        'reminder': 'REMINDER NOTICE',
        'demand': 'DEMAND NOTICE',
        'penalty': 'PENALTY NOTICE',
        'final_warrant': 'FINAL WARRANT NOTICE'
      };
      
      doc.fontSize(18).font('Helvetica-Bold')
         .text(noticeTypeTitles[notice.noticeType] || 'NOTICE', { align: 'center' });
      doc.moveDown(1.5);

      // Notice Number and Date
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Notice Number:', 60, doc.y);
      doc.font('Helvetica')
         .text(notice.noticeNumber, 200, doc.y);
      
      doc.font('Helvetica-Bold')
         .text('Issue Date:', 350, doc.y);
      doc.font('Helvetica')
         .text(new Date(notice.noticeDate).toLocaleDateString('en-IN'), 450, doc.y);
      
      doc.font('Helvetica-Bold')
         .text('Due Date:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(new Date(notice.dueDate).toLocaleDateString('en-IN'), 200, doc.y - 20);
      
      doc.moveDown(1.5);

      // To Section
      doc.fontSize(12).font('Helvetica-Bold')
         .text('To,', 60, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica')
         .text(`${owner.firstName} ${owner.lastName}`, 60, doc.y);
      if (owner.phone) {
        doc.text(`Phone: ${owner.phone}`, 60, doc.y + 15);
      }
      if (owner.email) {
        doc.text(`Email: ${owner.email}`, 60, doc.y + 15);
      }
      
      doc.moveDown(1);

      // Property Address
      doc.font('Helvetica-Bold')
         .text('Property Address:', 60, doc.y);
      doc.font('Helvetica')
         .text(`${property.address}, ${property.city}, ${property.state} - ${property.pincode}`, 60, doc.y + 15, { width: 480 });
      
      doc.moveDown(1);

      // Subject
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Subject:', 60, doc.y);
      doc.font('Helvetica')
         .text(`House Tax Payment Notice for Financial Year ${notice.financialYear}`, 60, doc.y + 15, { width: 480 });
      
      doc.moveDown(1.5);

      // Body Content
      doc.fontSize(11).font('Helvetica')
         .text('Dear Sir/Madam,', 60, doc.y);
      doc.moveDown(0.5);
      
      let bodyText = `This is to inform you that an amount of ₹${parseFloat(notice.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} is due against Property Number ${property.propertyNumber} for the Financial Year ${notice.financialYear}.`;
      
      if (parseFloat(notice.penaltyAmount || 0) > 0) {
        bodyText += ` A penalty amount of ₹${parseFloat(notice.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been levied.`;
      }
      
      bodyText += ` The due date for payment is ${new Date(notice.dueDate).toLocaleDateString('en-IN')}.`;
      
      doc.text(bodyText, 60, doc.y, { width: 480, align: 'justify' });
      
      doc.moveDown(1);

      // Amount Details Box
      const amountBoxY = doc.y;
      doc.rect(60, amountBoxY, 480, 120).stroke();
      
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Amount Details', 70, amountBoxY + 10);
      doc.moveDown(0.3);
      
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Base Amount:', 70, doc.y);
      doc.font('Helvetica')
         .text(`₹${parseFloat(demand.baseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y, { align: 'right' });
      
      if (parseFloat(demand.arrearsAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Arrears:', 70, doc.y + 20);
        doc.font('Helvetica')
           .text(`₹${parseFloat(demand.arrearsAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 20, { align: 'right' });
      }
      
      if (parseFloat(notice.penaltyAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Penalty:', 70, doc.y + 20);
        doc.font('Helvetica')
           .text(`₹${parseFloat(notice.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 20, { align: 'right' });
      }
      
      if (parseFloat(demand.interestAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Interest:', 70, doc.y + 20);
        doc.font('Helvetica')
           .text(`₹${parseFloat(demand.interestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 20, { align: 'right' });
      }
      
      doc.lineWidth(2);
      doc.moveTo(70, doc.y + 10).lineTo(530, doc.y + 10).stroke();
      doc.lineWidth(1);
      
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Total Amount Due:', 70, doc.y + 15);
      doc.font('Helvetica')
         .text(`₹${parseFloat(notice.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 15, { align: 'right' });
      
      doc.moveDown(1.5);

      // Warning Text based on notice type
      if (notice.noticeType === 'penalty') {
        doc.fontSize(11).font('Helvetica-Bold')
           .text('WARNING:', 60, doc.y);
        doc.font('Helvetica')
           .text('Failure to pay the above amount within the due date may result in further penalties and legal action.', 60, doc.y + 15, { width: 480 });
        doc.moveDown(1);
      } else if (notice.noticeType === 'final_warrant') {
        doc.fontSize(11).font('Helvetica-Bold')
           .text('FINAL NOTICE:', 60, doc.y);
        doc.font('Helvetica')
           .text('This is the final notice. Legal proceedings will be initiated if payment is not made immediately. Please contact the municipal office urgently.', 60, doc.y + 15, { width: 480 });
        doc.moveDown(1);
      }

      // Payment Instructions
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Payment Instructions:', 60, doc.y);
      doc.font('Helvetica')
         .text('1. Payment can be made online through the citizen portal', 60, doc.y + 15);
      doc.text('2. Payment can be made at the municipal office during office hours', 60, doc.y + 15);
      doc.text('3. For online payment, use the payment reference number provided in your account', 60, doc.y + 15);
      doc.text('4. Please retain this notice for your records', 60, doc.y + 15);
      
      doc.moveDown(1.5);

      // Signature Block
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Authorized Signatory', 400, doc.y);
      doc.font('Helvetica')
         .text('Tax Collection Department', 400, doc.y + 20);
      doc.text('Municipal Corporation', 400, doc.y + 15);
      
      doc.moveDown(2);

      // Footer Disclaimer
      doc.fontSize(8).font('Helvetica-Oblique')
         .text('This is a system-generated notice. For any queries, please contact the municipal office.', { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate Demand Notice PDF (buffer only, no file save)
 * Used for GET /api/demands/:id/pdf?type=notice
 */
export const generateDemandNoticePdfBuffer = (demand, options = {}) => {
  const { property = null, owner = null, ward = null, entityLabel = 'N/A', ulbName = 'Municipal Corporation' } = options;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const moduleLabel = { HOUSE_TAX: 'Property', D2DC: 'D2DC', WATER_TAX: 'Water', SHOP_TAX: 'Shop' }[demand.serviceType] || demand.serviceType;
      const originalAmount = getDemandOriginalAmount(demand);
      const discountAmount = (demand.taxDiscounts && demand.taxDiscounts.length)
        ? Number((demand.taxDiscounts.reduce((s, d) => s + parseFloat(d.discountAmount || 0), 0)).toFixed(2))
        : 0;
      const { finalAmount } = calculateFinalAmount(demand, {
        discountAmount,
        waiverAmount: parseFloat(demand.penaltyWaived || 0)
      });

      doc.fontSize(20).font('Helvetica-Bold').text(ulbName.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text('House Tax Collection & Management System', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(18).font('Helvetica-Bold').text('DEMAND NOTICE', { align: 'center' });
      doc.moveDown(1.5);

      let rowY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').text('Demand Number:', 60, rowY);
      doc.font('Helvetica').text(demand.demandNumber || 'N/A', 200, rowY);
      doc.font('Helvetica-Bold').text('Module Type:', 350, rowY);
      doc.font('Helvetica').text(moduleLabel, 450, rowY);
      rowY += 22;
      doc.font('Helvetica-Bold').text('Financial Year:', 60, rowY);
      doc.font('Helvetica').text(demand.financialYear || 'N/A', 200, rowY);
      doc.font('Helvetica-Bold').text('Due Date:', 350, rowY);
      doc.font('Helvetica').text(demand.dueDate ? new Date(demand.dueDate).toLocaleDateString('en-IN') : 'N/A', 450, rowY);
      rowY += 22;
      doc.font('Helvetica-Bold').text('Status:', 60, rowY);
      doc.font('Helvetica').text((demand.status || 'N/A').replace(/_/g, ' '), 200, rowY);
      doc.y = rowY + 12;
      doc.moveDown(1);

      if (owner) {
        doc.fontSize(12).font('Helvetica-Bold').text('Citizen Name:', 60, doc.y);
        doc.font('Helvetica').text(`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A', 200, doc.y);
        doc.moveDown(0.5);
      }
      doc.font('Helvetica-Bold').text('Property/Shop/Connection ID:', 60, doc.y);
      doc.font('Helvetica').text(entityLabel, 200, doc.y);
      doc.moveDown(1);

      const boxY = doc.y;
      doc.rect(50, boxY, 495, discountAmount > 0 ? 140 : 100).stroke();
      let boxRowY = boxY + 15;
      doc.fontSize(12).font('Helvetica-Bold').text('Original Amount:', 60, boxRowY);
      doc.font('Helvetica').text(`₹${originalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, boxRowY, { align: 'right' });
      if (discountAmount > 0) {
        boxRowY += 25;
        doc.font('Helvetica-Bold').text('Discount:', 60, boxRowY);
        doc.font('Helvetica').text(`₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, boxRowY, { align: 'right' });
      }
      boxRowY += 25;
      doc.lineWidth(1);
      doc.moveTo(60, boxRowY).lineTo(540, boxRowY).stroke();
      boxRowY += 15;
      doc.fontSize(12).font('Helvetica-Bold').text('Final Payable Amount:', 60, boxRowY);
      doc.font('Helvetica').text(`₹${finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, boxRowY, { align: 'right' });
      doc.y = boxY + (discountAmount > 0 ? 140 : 100) + 10;
      doc.moveDown(1.5);

      doc.fontSize(9).font('Helvetica-Oblique').text('This is a system-generated demand notice.', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Generate Demand Summary Receipt PDF (buffer only)
 * Used for GET /api/demands/:id/pdf?type=receipt
 * Same visual structure as payment receipt: header, section boxes, footer
 */
export const generateDemandSummaryReceiptPdfBuffer = (demand, options = {}) => {
  const { property = null, owner = null, ward = null, entityLabel = 'N/A', ulbName = 'Municipal Corporation' } = options;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const moduleLabel = { HOUSE_TAX: 'Property', D2DC: 'D2DC', WATER_TAX: 'Water', SHOP_TAX: 'Shop' }[demand.serviceType] || demand.serviceType;
      const originalAmount = getDemandOriginalAmount(demand);
      const discountAmount = (demand.taxDiscounts && demand.taxDiscounts.length)
        ? Number((demand.taxDiscounts.reduce((s, d) => s + parseFloat(d.discountAmount || 0), 0)).toFixed(2))
        : 0;
      const { finalAmount } = calculateFinalAmount(demand, {
        discountAmount,
        waiverAmount: parseFloat(demand.penaltyWaived || 0)
      });
      const paid = parseFloat(demand.paidAmount || 0);

      doc.fontSize(20).font('Helvetica-Bold').text(ulbName.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text('House Tax Collection & Management System', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(18).font('Helvetica-Bold').text('DEMAND SUMMARY RECEIPT', { align: 'center' });
      doc.moveDown(1.5);

      let y = doc.y;

      y = drawReceiptSection(doc, y, 'Receipt Details', [
        ['Demand Number', demand.demandNumber || 'N/A'],
        ['Module', moduleLabel],
        ['Due Date', demand.dueDate ? new Date(demand.dueDate).toLocaleDateString('en-IN') : 'N/A']
      ]);

      const citizenName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A' : 'N/A';
      y = drawReceiptSection(doc, y, 'Citizen & Entity', [
        ['Citizen Name', citizenName],
        ['Property/Shop/Connection ID', entityLabel]
      ]);

      const amountRows = [
        ['Original Amount', `₹${originalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Paid Amount', `₹${paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Balance / Final Payable', `₹${finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
      ];
      if (discountAmount > 0) {
        amountRows.splice(1, 0, ['Discount', `₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
      }
      y = drawReceiptSection(doc, y, 'Amount Summary', amountRows);

      doc.fontSize(9).font('Helvetica-Oblique').text('This is a system-generated summary. For payment receipt use the payment receipt.', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Generate Discount Approval Letter PDF (buffer only)
 * Used for GET /api/discounts/:id/pdf
 */
export const generateDiscountApprovalPdfBuffer = (discount, options = {}) => {
  const { demand = null, owner = null, entityLabel = 'N/A', approvedByName = 'N/A', ulbName = 'Municipal Corporation' } = options;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const moduleLabel = (discount.moduleType || 'N/A').toString();
      const originalAmount = demand ? getDemandOriginalAmount(demand) : 0;
      const discountAmt = Number((parseFloat(discount.discountAmount || 0)).toFixed(2));
      const discountTypeLabel = (discount.discountType === 'PERCENTAGE' ? '%' : 'Fixed');
      const finalAmount = demand
        ? calculateFinalAmount(demand, { discountAmount: discountAmt, waiverAmount: parseFloat(demand.penaltyWaived || 0) }).finalAmount
        : Number((originalAmount - discountAmt).toFixed(2));

      doc.fontSize(20).font('Helvetica-Bold').text(ulbName.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text('House Tax Collection & Management System', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(18).font('Helvetica-Bold').text('DISCOUNT APPROVAL LETTER', { align: 'center' });
      doc.moveDown(1.5);

      let rowY = doc.y;
      const rowH = 22;
      doc.fontSize(11).font('Helvetica-Bold').text('Discount ID:', 60, rowY);
      doc.font('Helvetica').text(String(discount.id), 200, rowY);
      doc.font('Helvetica-Bold').text('Module Type:', 350, rowY);
      doc.font('Helvetica').text(moduleLabel, 450, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Demand No:', 60, rowY);
      doc.font('Helvetica').text(demand ? (demand.demandNumber || 'N/A') : 'N/A', 200, rowY);
      rowY += rowH;
      if (owner) {
        doc.font('Helvetica-Bold').text('Citizen Name:', 60, rowY);
        doc.font('Helvetica').text(`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A', 200, rowY);
        rowY += rowH;
      }
      doc.font('Helvetica-Bold').text('Original Amount:', 60, rowY);
      doc.font('Helvetica').text(`₹${originalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, rowY);
      doc.font('Helvetica-Bold').text('Discount Type:', 350, rowY);
      doc.font('Helvetica').text(discountTypeLabel, 450, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Discount Amount:', 60, rowY);
      doc.font('Helvetica').text(`₹${discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Final Amount:', 60, rowY);
      doc.font('Helvetica').text(`₹${finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Reason:', 60, rowY);
      doc.font('Helvetica').text((discount.reason || 'N/A').substring(0, 200), 200, rowY, { width: 340 });
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Approved By:', 60, rowY);
      doc.font('Helvetica').text(approvedByName, 200, rowY);
      doc.font('Helvetica-Bold').text('Date:', 350, rowY);
      doc.font('Helvetica').text(discount.createdAt ? new Date(discount.createdAt).toLocaleDateString('en-IN') : 'N/A', 450, rowY);
      rowY += rowH;
      if (discount.documentUrl) {
        doc.font('Helvetica-Bold').text('Attached Application:', 60, rowY);
        doc.font('Helvetica').text('Reference document attached', 200, rowY);
        rowY += rowH;
      }
      doc.y = rowY + 10;
      doc.moveDown(1.5);

      doc.fontSize(9).font('Helvetica-Oblique').text('This is an official discount approval letter. Official seal/footer.', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Generate Penalty Waiver letter PDF buffer (for download)
 */
export const generatePenaltyWaiverLetterPdfBuffer = (waiver, options = {}) => {
  const { demand = null, owner = null, entityLabel = 'N/A', approvedByName = 'N/A', ulbName = 'Municipal Corporation' } = options;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const moduleLabel = (waiver.moduleType || 'N/A').toString();
      const penaltyAmount = demand ? getDemandPenaltyAmount(demand) : 0;
      const waiverAmt = Number((parseFloat(waiver.waiverAmount || 0)).toFixed(2));
      const waiverTypeLabel = (waiver.waiverType === 'PERCENTAGE' ? '%' : 'Fixed');
      const remainingPenalty = Number((penaltyAmount - waiverAmt).toFixed(2));
      const discountForFinal = demand && demand.taxDiscounts && demand.taxDiscounts.length
        ? Number((demand.taxDiscounts.reduce((s, d) => s + parseFloat(d.discountAmount || 0), 0)).toFixed(2))
        : 0;
      const finalAmount = demand
        ? calculateFinalAmount(demand, { discountAmount: discountForFinal, waiverAmount: waiverAmt }).finalAmount
        : 0;

      doc.fontSize(20).font('Helvetica-Bold').text(ulbName.toUpperCase(), { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text('House Tax Collection & Management System', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(18).font('Helvetica-Bold').text('PENALTY WAIVER APPROVAL LETTER', { align: 'center' });
      doc.moveDown(1.5);

      let rowY = doc.y;
      const rowH = 22;
      doc.fontSize(11).font('Helvetica-Bold').text('Waiver ID:', 60, rowY);
      doc.font('Helvetica').text(String(waiver.id), 200, rowY);
      doc.font('Helvetica-Bold').text('Module Type:', 350, rowY);
      doc.font('Helvetica').text(moduleLabel, 450, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Demand No:', 60, rowY);
      doc.font('Helvetica').text(demand ? (demand.demandNumber || 'N/A') : 'N/A', 200, rowY);
      rowY += rowH;
      if (owner) {
        doc.font('Helvetica-Bold').text('Citizen Name:', 60, rowY);
        doc.font('Helvetica').text(`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A', 200, rowY);
        rowY += rowH;
      }
      doc.font('Helvetica-Bold').text('Original Penalty:', 60, rowY);
      doc.font('Helvetica').text(`₹${penaltyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, rowY);
      doc.font('Helvetica-Bold').text('Waiver Type:', 350, rowY);
      doc.font('Helvetica').text(waiverTypeLabel, 450, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Waiver Amount:', 60, rowY);
      doc.font('Helvetica').text(`₹${waiverAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Remaining Penalty:', 60, rowY);
      doc.font('Helvetica').text(`₹${remainingPenalty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Final Payable:', 60, rowY);
      doc.font('Helvetica').text(`₹${finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Reason:', 60, rowY);
      doc.font('Helvetica').text((waiver.reason || 'N/A').substring(0, 200), 200, rowY, { width: 340 });
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Approved By:', 60, rowY);
      doc.font('Helvetica').text(approvedByName, 200, rowY);
      doc.font('Helvetica-Bold').text('Date:', 350, rowY);
      doc.font('Helvetica').text(waiver.createdAt ? new Date(waiver.createdAt).toLocaleDateString('en-IN') : 'N/A', 450, rowY);
      rowY += rowH;
      if (waiver.documentUrl) {
        doc.font('Helvetica-Bold').text('Attached Application:', 60, rowY);
        doc.font('Helvetica').text('Reference document attached', 200, rowY);
        rowY += rowH;
      }
      doc.y = rowY + 10;
      doc.moveDown(1.5);

      doc.fontSize(9).font('Helvetica-Oblique').text('This is an official penalty waiver approval letter. Official seal/footer.', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};
