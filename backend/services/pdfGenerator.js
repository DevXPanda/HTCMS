import PDFDocument from 'pdfkit';
import { 
  generatePdfFilename, 
  getReceiptPdfPath, 
  getNoticePdfPath,
  savePdfFile 
} from '../utils/pdfStorage.js';

/**
 * PDF Generation Service
 * Generates PDFs for payment receipts and notices
 */

/**
 * Generate Payment Receipt PDF
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
      
      // Receipt Title
      doc.fontSize(18).font('Helvetica-Bold')
         .text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown(1.5);

      // Receipt Details Box
      const receiptBoxY = doc.y;
      doc.rect(50, receiptBoxY, 495, 200).stroke();
      
      // Receipt Number
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Receipt Number:', 60, receiptBoxY + 15);
      doc.font('Helvetica')
         .text(payment.receiptNumber || payment.paymentNumber, 200, receiptBoxY + 15);
      
      // Payment Date & Time
      doc.font('Helvetica-Bold')
         .text('Payment Date:', 60, receiptBoxY + 40);
      doc.font('Helvetica')
         .text(new Date(payment.paymentDate).toLocaleString('en-IN', { 
           dateStyle: 'long', 
           timeStyle: 'short' 
         }), 200, receiptBoxY + 40);
      
      // Payment Status
      doc.font('Helvetica-Bold')
         .text('Status:', 60, receiptBoxY + 65);
      doc.font('Helvetica')
         .text(payment.status.toUpperCase(), 200, receiptBoxY + 65);
      
      doc.moveDown(1);

      // Property Details
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Property Details', 60, doc.y);
      doc.moveDown(0.5);
      
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Property Number:', 60, doc.y);
      doc.font('Helvetica')
         .text(property.propertyNumber || 'N/A', 200, doc.y);
      
      doc.font('Helvetica-Bold')
         .text('Address:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(`${property.address}, ${property.city}, ${property.state} - ${property.pincode}`, 200, doc.y - 20, { width: 300 });
      
      doc.font('Helvetica-Bold')
         .text('Ward:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(ward ? `${ward.wardNumber} - ${ward.wardName}` : 'N/A', 200, doc.y - 20);
      
      doc.moveDown(1);

      // Owner Details
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Owner Details', 60, doc.y);
      doc.moveDown(0.5);
      
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Name:', 60, doc.y);
      doc.font('Helvetica')
         .text(`${owner.firstName} ${owner.lastName}`, 200, doc.y);
      
      doc.font('Helvetica-Bold')
         .text('Email:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(owner.email || 'N/A', 200, doc.y - 20);
      
      doc.font('Helvetica-Bold')
         .text('Phone:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(owner.phone || 'N/A', 200, doc.y - 20);
      
      doc.moveDown(1.5);

      // Payment Details Box
      const paymentBoxY = doc.y;
      doc.rect(50, paymentBoxY, 495, 180).stroke();
      
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Payment Details', 60, paymentBoxY + 15);
      doc.moveDown(0.5);
      
      // Financial Year
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Financial Year:', 60, doc.y);
      doc.font('Helvetica')
         .text(demand.financialYear || 'N/A', 200, doc.y);
      
      // Demand Number
      doc.font('Helvetica-Bold')
         .text('Demand Number:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(demand.demandNumber || 'N/A', 200, doc.y - 20);
      
      // Payment Mode
      doc.font('Helvetica-Bold')
         .text('Payment Mode:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(payment.paymentMode.toUpperCase(), 200, doc.y - 20);
      
      // Payment details based on mode
      if (payment.paymentMode === 'cheque' || payment.paymentMode === 'dd') {
        doc.font('Helvetica-Bold')
           .text('Cheque/DD Number:', 60, doc.y + 20);
        doc.font('Helvetica')
           .text(payment.chequeNumber || 'N/A', 200, doc.y - 20);
        
        if (payment.bankName) {
          doc.font('Helvetica-Bold')
             .text('Bank Name:', 60, doc.y + 20);
          doc.font('Helvetica')
             .text(payment.bankName, 200, doc.y - 20);
        }
      }
      
      if (payment.transactionId) {
        doc.font('Helvetica-Bold')
           .text('Transaction ID:', 60, doc.y + 20);
        doc.font('Helvetica')
           .text(payment.transactionId, 200, doc.y - 20);
      }
      
      doc.moveDown(1);

      // Amount Details Table
      const amountY = doc.y;
      doc.fontSize(12).font('Helvetica-Bold')
         .text('Amount Paid:', 60, amountY);
      doc.font('Helvetica')
         .text(`₹${parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, amountY, { align: 'right' });
      
      if (parseFloat(demand.penaltyAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Penalty Amount:', 60, doc.y + 20);
        doc.font('Helvetica')
           .text(`₹${parseFloat(demand.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 20, { align: 'right' });
      }
      
      if (parseFloat(demand.interestAmount || 0) > 0) {
        doc.font('Helvetica-Bold')
           .text('Interest Amount:', 60, doc.y + 20);
        doc.font('Helvetica')
           .text(`₹${parseFloat(demand.interestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 20, { align: 'right' });
      }
      
      doc.moveDown(0.5);
      doc.lineWidth(2);
      doc.moveTo(60, doc.y).lineTo(540, doc.y).stroke();
      doc.lineWidth(1);
      
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Total Paid:', 60, doc.y + 10);
      doc.font('Helvetica')
         .text(`₹${parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 10, { align: 'right' });
      
      doc.fontSize(11).font('Helvetica-Bold')
         .text('Remaining Balance:', 60, doc.y + 20);
      doc.font('Helvetica')
         .text(`₹${parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 400, doc.y - 20, { align: 'right' });
      
      doc.moveDown(1.5);

      // Cashier Details
      if (cashier) {
        doc.fontSize(11).font('Helvetica-Bold')
           .text('Received By:', 60, doc.y);
        doc.font('Helvetica')
           .text(`${cashier.firstName} ${cashier.lastName}`, 200, doc.y);
      }
      
      doc.moveDown(2);

      // Footer
      doc.fontSize(9).font('Helvetica-Oblique')
         .text('This is a system-generated receipt. No signature required.', { align: 'center' });
      
      doc.fontSize(8).font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      
      // Finalize PDF
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
