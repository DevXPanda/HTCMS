import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';
import {
  generatePdfFilename,
  getReceiptPdfPath,
  getNoticePdfPath,
  savePdfFile
} from '../utils/pdfStorage.js';
import { getDemandOriginalAmount, getDemandPenaltyAmount, calculateFinalAmount } from '../utils/financialCalculations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '..', '..', 'frontend', 'public', 'ULB Logo.png');

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
/** Label column width + value column (fixed width + right align) for en-IN amounts */
const RECEIPT_LABEL_MAX_W = 210;
const RECEIPT_VALUE_COL_X = 275;
const RECEIPT_VALUE_COL_W = RECEIPT_VALUE_RIGHT - RECEIPT_VALUE_COL_X;
const SECTION_TITLE_H = 22;
const BOX_TOP_PAD = 8;
const BOX_BOTTOM_PAD = 10;
const SECTION_GAP = 6;

/** Use "Rs." not Unicode ₹ — PDF built-in Helvetica/WinAnsi mis-renders ₹ as a superscript "¹" */
function formatInrAmount(n) {
  const num = Number(n || 0);
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Centered ULB block under system title (uses current doc.y flow) */
function drawUlbDetailsBlock(doc, ulbDetails) {
  if (!ulbDetails) return;
  doc.fillColor('#000000');
  if (ulbDetails.name) {
    doc.fontSize(12).font('Helvetica-Bold').text(String(ulbDetails.name), { align: 'center' });
  }
  if (ulbDetails.address_line_1) {
    doc.fontSize(10).font('Helvetica').text(String(ulbDetails.address_line_1), { align: 'center' });
  }
  if (ulbDetails.address_line_2) {
    doc.fontSize(10).font('Helvetica').text(String(ulbDetails.address_line_2), { align: 'center' });
  }
  const cityState = [ulbDetails.district, ulbDetails.state].filter(Boolean).join(', ');
  if (cityState || ulbDetails.pincode) {
    doc.fontSize(10).font('Helvetica').text(`${cityState}${ulbDetails.pincode ? ` - ${ulbDetails.pincode}` : ''}`, { align: 'center' });
  }
  const contactLine = [ulbDetails.phone ? `Phone: ${ulbDetails.phone}` : null, ulbDetails.email ? `Email: ${ulbDetails.email}` : null]
    .filter(Boolean)
    .join(' | ');
  if (contactLine) {
    doc.fontSize(9).font('Helvetica').text(contactLine, { align: 'center' });
  }
}

/**
 * One outer border (government bill style); shaded subsection headers inside + rows.
 * @param {Array<{ title: string, rows: [string, unknown][] }>} sections
 */
function drawUnifiedReceiptBox(doc, startY, sections) {
  let y = startY + BOX_TOP_PAD;
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    doc.save();
    doc.fillColor('#e8f4fc').rect(RECEIPT_LEFT + 1, y, RECEIPT_WIDTH - 2, SECTION_TITLE_H).fill();
    doc.restore();
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2c5282').text(sec.title.toUpperCase(), RECEIPT_LABEL_LEFT, y + 5);
    doc.fillColor('#000000');
    y += SECTION_TITLE_H;
    doc.fontSize(10);
    for (const [label, value] of sec.rows) {
      const displayVal = value == null || value === '' ? 'N/A' : String(value);
      doc.font('Helvetica-Bold').text(label, RECEIPT_LABEL_LEFT, y + 3, { width: RECEIPT_LABEL_MAX_W });
      doc.font('Helvetica').text(displayVal, RECEIPT_VALUE_COL_X, y + 3, {
        width: RECEIPT_VALUE_COL_W,
        align: 'right'
      });
      y += ROW_HEIGHT;
    }
    if (i < sections.length - 1) {
      doc.save();
      doc.strokeColor('#bdbdbd')
        .lineWidth(0.6)
        .moveTo(RECEIPT_LEFT + 12, y + SECTION_GAP / 2)
        .lineTo(RECEIPT_LEFT + RECEIPT_WIDTH - 12, y + SECTION_GAP / 2)
        .stroke();
      doc.restore();
      doc.strokeColor('#000000').lineWidth(1);
      y += SECTION_GAP;
    }
  }
  const boxH = y - startY + BOX_BOTTOM_PAD;
  doc.rect(RECEIPT_LEFT, startY, RECEIPT_WIDTH, boxH).stroke();
  return startY + boxH + 12;
}

async function generateQrBuffer(payload) {
  try {
    return await QRCode.toBuffer(payload || 'ULB Receipt', { width: 120, margin: 1 });
  } catch (_) {
    return null;
  }
}

async function generateBarcodeBuffer(value) {
  try {
    return await bwipjs.toBuffer({
      bcid: 'code128',
      text: String(value || 'NA-RECEIPT'),
      scale: 2,
      height: 8,
      includetext: false,
      backgroundcolor: 'FFFFFF'
    });
  } catch (_) {
    return null;
  }
}

/**
 * Render payment receipt into an existing PDFDocument (async for QR/barcode).
 */
async function renderPaymentReceiptPdf(doc, payment, demand, property, owner, ward, cashier, ulbDetails = null) {
  // Header Blue Bar Accent
  doc.save();
  doc.fillColor('#2c5282').rect(50, 20, 495, 8).fill();
  doc.restore();

  // Logo
  try {
    doc.image(LOGO_PATH, RECEIPT_LEFT + (RECEIPT_WIDTH - 60) / 2, 45, { width: 60 });
    doc.moveDown(4.5);
  } catch (err) {
    console.error('Logo not found at:', LOGO_PATH);
  }

  doc.fontSize(22).font('Helvetica-Bold').text('URBAN LOCAL BODIES', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5282').text('Tax Collection & Management System', { align: 'center' });
  doc.fillColor('#000000');
  doc.moveDown(0.3);
  drawUlbDetailsBlock(doc, ulbDetails);
  doc.moveDown(0.8);

  doc.lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
  doc.moveDown(0.5);

  const statusRaw = (payment.status || 'completed').toString().replace(/_/g, ' ');
  doc.fontSize(16).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
  doc.moveDown(0.35);
  doc.fontSize(11).font('Helvetica-Bold').text(`STATUS: ${statusRaw.toUpperCase()}`, { align: 'center' });
  doc.moveDown(1.2);

  let y = doc.y;

  const paymentDateStr = new Date(payment.paymentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
  const locationStr = ward ? `${ward.wardNumber} - ${ward.wardName}` : 'N/A';
  const addressStr = property
    ? [property.address, property.city, property.state, property.pincode].filter(Boolean).join(', ')
    : '';
  const ownerName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : 'N/A';
  const amountPaid = formatInrAmount(payment.amount);
  const paymentDetailRows = [
    ['Financial Year', demand?.financialYear],
    ['Demand Number', demand?.demandNumber || 'N/A'],
    ['Payment Mode', (payment.paymentMode || '').toUpperCase()],
    ['Amount Paid', amountPaid],
    ['Final Amount', amountPaid]
  ];
  if (payment.paymentMode === 'cheque' || payment.paymentMode === 'dd') {
    paymentDetailRows.splice(3, 0, ['Cheque/DD Number', payment.chequeNumber]);
    if (payment.bankName) paymentDetailRows.push(['Bank Name', payment.bankName]);
  }
  if (payment.transactionId) {
    paymentDetailRows.push(['Transaction ID', payment.transactionId]);
  }

  y = drawUnifiedReceiptBox(doc, y, [
    {
      title: 'Receipt Details',
      rows: [
        ['Receipt Number', payment.receiptNumber || payment.paymentNumber],
        ['Payment Date', paymentDateStr],
        ['Payment ID', payment.paymentNumber || payment.id],
        ['Location', locationStr]
      ]
    },
    {
      title: 'Citizen & Entity',
      rows: [
        ['Citizen Name', ownerName],
        ['Citizen Email', owner?.email],
        ['Citizen Phone', owner?.phone],
        ['Property Number', property?.propertyNumber],
        ['Address', addressStr || 'N/A']
      ]
    },
    { title: 'Amount Summary', rows: paymentDetailRows }
  ]);

  if (cashier) {
    doc.fontSize(10).font('Helvetica-Bold').text('Received By:', RECEIPT_LABEL_LEFT, y);
    doc.font('Helvetica').text(`${cashier.firstName || ''} ${cashier.lastName || ''}`.trim(), 200, y);
    y += ROW_HEIGHT + 8;
  }

  doc.y = y;
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica-Oblique').text('This is a system-generated receipt.', { align: 'center' });
  doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

  const qrBuffer = await generateQrBuffer(`Receipt Verification ID: ${payment.receiptNumber || payment.paymentNumber || payment.id}`);
  const barcodeBuffer = await generateBarcodeBuffer(payment.receiptNumber || payment.paymentNumber || payment.id);
  const footerY = Math.min(doc.y + 8, 760);
  if (qrBuffer) {
    doc.image(qrBuffer, 60, footerY, { width: 48, height: 48 });
  }
  if (barcodeBuffer) {
    doc.image(barcodeBuffer, 400, footerY + 8, { width: 130, height: 32 });
  }
}

/**
 * Payment receipt PDF as buffer (always current template — use for downloads).
 */
export async function generateReceiptPdfBuffer(payment, demand, property, owner, ward, cashier, ulbDetails = null) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    renderPaymentReceiptPdf(doc, payment, demand, property, owner, ward, cashier, ulbDetails)
      .then(() => doc.end())
      .catch(reject);
  });
}

/**
 * Generate Payment Receipt PDF (saves to disk)
 */
export const generateReceiptPdf = async (payment, demand, property, owner, ward, cashier, ulbDetails = null) => {
  const pdfBuffer = await generateReceiptPdfBuffer(payment, demand, property, owner, ward, cashier, ulbDetails);
  const filename = generatePdfFilename('RECEIPT', payment.id);
  const filePath = getReceiptPdfPath(filename);
  await savePdfFile(pdfBuffer, filePath);
  return { filename, filePath, buffer: pdfBuffer };
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

      // Header Blue Bar Accent
      doc.save();
      doc.fillColor('#2c5282').rect(50, 20, 495, 8).fill(); 
      doc.restore();

      // Logo
      try {
        doc.image(LOGO_PATH, RECEIPT_LEFT + (RECEIPT_WIDTH - 60) / 2, 45, { width: 60 });
        doc.moveDown(4.5);
      } catch (err) {
        console.error('Logo not found at:', LOGO_PATH);
      }

      // Header Text
      doc.fontSize(22).font('Helvetica-Bold')
         .text('MUNICIPAL CORPORATION', { align: 'center', tracking: 2 });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5282')
         .text('Urban Local Bodies', { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.8);
      
      doc.lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
      doc.moveDown(0.5);
      
      // Notice Type Title
      const noticeTypeTitles = {
        'reminder': 'REMINDER NOTICE',
        'demand': 'DEMAND NOTICE',
        'penalty': 'PENALTY NOTICE',
        'final_warrant': 'FINAL WARRANT NOTICE'
      };
      
      doc.fontSize(18).font('Helvetica-Bold')
         .text(noticeTypeTitles[notice.noticeType] || 'NOTICE', { align: 'center', charSpacing: 1 });
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
      
      let bodyText = `This is to inform you that an amount of ${formatInrAmount(notice.amountDue || 0)} is due against Property Number ${property.propertyNumber} for the Financial Year ${notice.financialYear}.`;
      
      if (parseFloat(notice.penaltyAmount || 0) > 0) {
        bodyText += ` A penalty amount of ${formatInrAmount(notice.penaltyAmount || 0)} has been levied.`;
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
         .text(formatInrAmount(demand.baseAmount || 0), 395, doc.y, { width: 130, align: 'right' });
      
      if (parseFloat(demand.arrearsAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Arrears:', 70, doc.y + 20);
        doc.font('Helvetica')
           .text(formatInrAmount(demand.arrearsAmount || 0), 395, doc.y - 20, { width: 130, align: 'right' });
      }
      
      if (parseFloat(notice.penaltyAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Penalty:', 70, doc.y + 20);
        doc.font('Helvetica')
           .text(formatInrAmount(notice.penaltyAmount || 0), 395, doc.y - 20, { width: 130, align: 'right' });
      }
      
      if (parseFloat(demand.interestAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Interest:', 70, doc.y + 20);
        doc.font('Helvetica')
           .text(formatInrAmount(demand.interestAmount || 0), 395, doc.y - 20, { width: 130, align: 'right' });
      }
      
      doc.lineWidth(2);
      doc.moveTo(70, doc.y + 10).lineTo(530, doc.y + 10).stroke();
      doc.lineWidth(1);
      
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Total Amount Due:', 70, doc.y + 15);
      doc.font('Helvetica')
         .text(formatInrAmount(notice.amountDue || 0), 395, doc.y - 15, { width: 130, align: 'right' });
      
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
  const { owner = null, entityLabel = 'N/A', ulbDetails = null } = options;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    (async () => {
      try {
        const moduleLabel = { HOUSE_TAX: 'Property', D2DC: 'D2DC', WATER_TAX: 'Water', SHOP_TAX: 'Shop' }[demand.serviceType] || demand.serviceType;
        const originalAmount = getDemandOriginalAmount(demand);
        const discountAmount = demand.taxDiscounts && demand.taxDiscounts.length
          ? Number(demand.taxDiscounts.reduce((s, d) => s + parseFloat(d.discountAmount || 0), 0).toFixed(2))
          : 0;
        const { finalAmount } = calculateFinalAmount(demand, {
          discountAmount,
          waiverAmount: parseFloat(demand.penaltyWaived || 0)
        });

        doc.save();
        doc.fillColor('#2c5282').rect(50, 20, 495, 8).fill();
        doc.restore();

        try {
          doc.image(LOGO_PATH, (595.28 - 60) / 2, 45, { width: 60 });
          doc.moveDown(4.5);
        } catch (err) {
          console.error('Logo not found at:', LOGO_PATH);
        }

        doc.fontSize(22).font('Helvetica-Bold').text('URBAN LOCAL BODIES', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5282').text('Tax Collection & Management System', { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);
        drawUlbDetailsBlock(doc, ulbDetails);
        doc.moveDown(0.6);

        doc.lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(16).font('Helvetica-Bold').text('DEMAND NOTICE', { align: 'center' });
        doc.moveDown(0.35);
        const st = (demand.status || 'N/A').toString().replace(/_/g, ' ');
        doc.fontSize(11).font('Helvetica-Bold').text(`STATUS: ${st.toUpperCase()}`, { align: 'center' });
        doc.moveDown(1.2);

        let y = doc.y;

        const citizenName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A' : 'N/A';
        const amountRows = [['Original Amount', formatInrAmount(originalAmount)]];
        if (discountAmount > 0) {
          amountRows.push(['Discount', formatInrAmount(discountAmount)]);
        }
        amountRows.push(['Final Payable Amount', formatInrAmount(finalAmount)]);

        y = drawUnifiedReceiptBox(doc, y, [
          {
            title: 'Receipt Details',
            rows: [
              ['Demand Number', demand.demandNumber || 'N/A'],
              ['Financial Year', demand.financialYear || 'N/A'],
              ['Module Type', moduleLabel],
              ['Due Date', demand.dueDate ? new Date(demand.dueDate).toLocaleDateString('en-IN') : 'N/A']
            ]
          },
          {
            title: 'Citizen & Entity',
            rows: [
              ['Citizen Name', citizenName],
              ['Property / Shop / Connection ID', entityLabel]
            ]
          },
          { title: 'Amount Summary', rows: amountRows }
        ]);

        doc.y = y;
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica-Oblique').text('This is a system-generated demand notice.', { align: 'center' });
        doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

        const qrBuffer = await generateQrBuffer(`Demand verification: ${demand.demandNumber || demand.id}`);
        const barcodeBuffer = await generateBarcodeBuffer(demand.demandNumber || String(demand.id));
        const footerY = Math.min(doc.y + 8, 760);
        if (qrBuffer) {
          doc.image(qrBuffer, 60, footerY, { width: 48, height: 48 });
        }
        if (barcodeBuffer) {
          doc.image(barcodeBuffer, 400, footerY + 8, { width: 130, height: 32 });
        }

        doc.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
};

/**
 * Generate Demand Summary Receipt PDF (buffer only)
 * Used for GET /api/demands/:id/pdf?type=receipt
 * Same visual structure as payment receipt: header, section boxes, footer
 */
export const generateDemandSummaryReceiptPdfBuffer = (demand, options = {}) => {
  const { owner = null, entityLabel = 'N/A', ulbDetails = null } = options;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    (async () => {
      try {
        const moduleLabel = { HOUSE_TAX: 'Property', D2DC: 'D2DC', WATER_TAX: 'Water', SHOP_TAX: 'Shop' }[demand.serviceType] || demand.serviceType;
        const originalAmount = getDemandOriginalAmount(demand);
        const discountAmount = demand.taxDiscounts && demand.taxDiscounts.length
          ? Number(demand.taxDiscounts.reduce((s, d) => s + parseFloat(d.discountAmount || 0), 0).toFixed(2))
          : 0;
        const { finalAmount } = calculateFinalAmount(demand, {
          discountAmount,
          waiverAmount: parseFloat(demand.penaltyWaived || 0)
        });
        const paid = parseFloat(demand.paidAmount || 0);

        doc.save();
        doc.fillColor('#2c5282').rect(50, 20, 495, 8).fill();
        doc.restore();

        try {
          doc.image(LOGO_PATH, RECEIPT_LEFT + (RECEIPT_WIDTH - 60) / 2, 45, { width: 60 });
          doc.moveDown(4.5);
        } catch (err) {
          console.error('Logo not found at:', LOGO_PATH);
        }

        doc.fontSize(22).font('Helvetica-Bold').text('URBAN LOCAL BODIES', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5282').text('Tax Collection & Management System', { align: 'center' });
        doc.fillColor('#000000');
        doc.moveDown(0.3);
        drawUlbDetailsBlock(doc, ulbDetails);
        doc.moveDown(0.6);

        doc.lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(16).font('Helvetica-Bold').text('DEMAND SUMMARY RECEIPT', { align: 'center' });
        doc.moveDown(0.35);
        const st = (demand.status || 'N/A').toString().replace(/_/g, ' ');
        doc.fontSize(11).font('Helvetica-Bold').text(`STATUS: ${st.toUpperCase()}`, { align: 'center' });
        doc.moveDown(1.2);

        let y = doc.y;

        const citizenName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'N/A' : 'N/A';
        const amountRows = [
          ['Original Amount', formatInrAmount(originalAmount)],
          ['Paid Amount', formatInrAmount(paid)],
          ['Balance / Final Payable', formatInrAmount(finalAmount)]
        ];
        if (discountAmount > 0) {
          amountRows.splice(1, 0, ['Discount', formatInrAmount(discountAmount)]);
        }

        y = drawUnifiedReceiptBox(doc, y, [
          {
            title: 'Receipt Details',
            rows: [
              ['Demand Number', demand.demandNumber || 'N/A'],
              ['Module', moduleLabel],
              ['Due Date', demand.dueDate ? new Date(demand.dueDate).toLocaleDateString('en-IN') : 'N/A']
            ]
          },
          {
            title: 'Citizen & Entity',
            rows: [
              ['Citizen Name', citizenName],
              ['Property/Shop/Connection ID', entityLabel]
            ]
          },
          { title: 'Amount Summary', rows: amountRows }
        ]);

        doc.y = y;
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica-Oblique').text('This is a system-generated summary. For payment receipt use the payment receipt.', { align: 'center' });
        doc.fontSize(8).font('Helvetica').text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

        const qrBuffer = await generateQrBuffer(`Demand summary: ${demand.demandNumber || demand.id}`);
        const barcodeBuffer = await generateBarcodeBuffer(demand.demandNumber || String(demand.id));
        const footerY = Math.min(doc.y + 8, 760);
        if (qrBuffer) {
          doc.image(qrBuffer, 60, footerY, { width: 48, height: 48 });
        }
        if (barcodeBuffer) {
          doc.image(barcodeBuffer, 400, footerY + 8, { width: 130, height: 32 });
        }

        doc.end();
      } catch (e) {
        reject(e);
      }
    })();
  });
};

/**
 * Generate Discount Approval Letter PDF (buffer only)
 * Used for GET /api/discounts/:id/pdf
 */
export const generateDiscountApprovalPdfBuffer = (discount, options = {}) => {
  const { demand = null, owner = null, entityLabel = 'N/A', approvedByName = 'N/A', ulbName = 'Urban Local Bodies' } = options;
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

      // Header Blue Bar Accent
      doc.save();
      doc.fillColor('#2c5282').rect(50, 20, 495, 8).fill(); 
      doc.restore();

      // Logo
      try {
        doc.image(LOGO_PATH, (595.28 - 60) / 2, 45, { width: 60 });
        doc.moveDown(4.5);
      } catch (err) {
        console.error('Logo not found at:', LOGO_PATH);
      }

      doc.fontSize(22).font('Helvetica-Bold').text('URBAN LOCAL BODIES', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5282').text('Tax Collection & Management System', { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.8);
      
      doc.lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(16).font('Helvetica-Bold').text('DISCOUNT APPROVAL LETTER', { align: 'center' });
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
      doc.font('Helvetica').text(formatInrAmount(originalAmount), 200, rowY);
      doc.font('Helvetica-Bold').text('Discount Type:', 350, rowY);
      doc.font('Helvetica').text(discountTypeLabel, 450, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Discount Amount:', 60, rowY);
      doc.font('Helvetica').text(formatInrAmount(discountAmt), 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Final Amount:', 60, rowY);
      doc.font('Helvetica').text(formatInrAmount(finalAmount), 200, rowY);
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
  const { demand = null, owner = null, entityLabel = 'N/A', approvedByName = 'N/A', ulbName = 'Urban Local Bodies' } = options;
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

      // Header Blue Bar Accent
      doc.save();
      doc.fillColor('#2c5282').rect(50, 20, 495, 8).fill(); 
      doc.restore();

      // Logo
      try {
        doc.image(LOGO_PATH, (595.28 - 60) / 2, 45, { width: 60 });
        doc.moveDown(4.5);
      } catch (err) {
        console.error('Logo not found at:', LOGO_PATH);
      }

      doc.fontSize(22).font('Helvetica-Bold').text('URBAN LOCAL BODIES', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5282').text('Tax Collection & Management System', { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(0.8);
      
      doc.lineWidth(1.5).moveTo(150, doc.y).lineTo(445, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(16).font('Helvetica-Bold').text('PENALTY WAIVER APPROVAL LETTER', { align: 'center' });
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
      doc.font('Helvetica').text(formatInrAmount(penaltyAmount), 200, rowY);
      doc.font('Helvetica-Bold').text('Waiver Type:', 350, rowY);
      doc.font('Helvetica').text(waiverTypeLabel, 450, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Waiver Amount:', 60, rowY);
      doc.font('Helvetica').text(formatInrAmount(waiverAmt), 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Remaining Penalty:', 60, rowY);
      doc.font('Helvetica').text(formatInrAmount(remainingPenalty), 200, rowY);
      rowY += rowH;
      doc.font('Helvetica-Bold').text('Final Payable:', 60, rowY);
      doc.font('Helvetica').text(formatInrAmount(finalAmount), 200, rowY);
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
