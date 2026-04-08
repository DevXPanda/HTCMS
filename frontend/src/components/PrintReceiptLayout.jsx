import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Barcode from 'react-barcode';

/**
 * Reusable PrintReceiptLayout for professional government-style receipts
 * 
 * @param {Object} ulbDetails - Full ULB details including name, address, phone, email
 * @param {string} receiptTitle - Title of the receipt (e.g., PAYMENT RECEIPT)
 * @param {Object} sections - Array of sections to display: { title: string, content: ReactNode | Array<{label, value}> }
 * @param {string} status - Paid, Pending, or Expired
 * @param {string} timestamp - Generation timestamp
 */
const PrintReceiptLayout = ({
  ulbDetails = {},
  receiptTitle = '',
  sections = [],
  status = '',
  timestamp = new Date().toLocaleString(),
  receiptId = '',
  verificationUrl = '',
  barcodeValue = ''
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const normalizedUlbDetails = useMemo(() => {
    const city = ulbDetails.city || ulbDetails.district || '';
    const state = ulbDetails.state || '';
    const pincode = ulbDetails.pincode || '';
    const addressLine1 = ulbDetails.address_line_1 || ulbDetails.addressLine1 || '';
    const addressLine2 = ulbDetails.address_line_2 || ulbDetails.addressLine2 || '';
    const contactLine = [ulbDetails.phone ? `Phone: ${ulbDetails.phone}` : null, ulbDetails.email ? `Email: ${ulbDetails.email}` : null]
      .filter(Boolean)
      .join(' | ');

    return {
      name: ulbDetails.name || 'Urban Local Body',
      addressLine1,
      addressLine2,
      cityStatePincode: [city, state].filter(Boolean).join(', ') + (pincode ? ` - ${pincode}` : ''),
      contactLine
    };
  }, [ulbDetails]);

  const qrPayload = useMemo(() => {
    if (verificationUrl) return verificationUrl;
    if (receiptId) return `Receipt Verification ID: ${receiptId}`;
    return `ULB Receipt generated on ${timestamp}`;
  }, [verificationUrl, receiptId, timestamp]);

  const resolvedBarcodeValue = barcodeValue || receiptId || 'NA-RECEIPT';

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(qrPayload, { width: 120, margin: 1 })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl('');
      });
    return () => {
      isMounted = false;
    };
  }, [qrPayload]);

  return (
    <div className="print-container bg-white p-8 max-w-[800px] mx-auto shadow-md border-2 border-black relative overflow-hidden">
      {/* Watermark Section */}
      <div className="receipt-watermark-overlay opacity-[0.03] pointer-events-none absolute inset-0 flex items-center justify-center p-12 -rotate-12 z-0 no-print-watermark">
        <h1 className="text-8xl font-black uppercase text-center leading-none tracking-tighter text-gray-900 border-[10px] border-gray-900 p-8 select-none">
          {normalizedUlbDetails.name}
        </h1>
      </div>

      <div className="receipt-print-top relative z-10">
        {/* Header Enhancement - Logo Left, Text Centered */}
        <div className="header border-b pb-2 mb-2 flex items-center relative min-h-[70px]">
          <img
            src="/ULB Logo.png"
            alt="ULB Logo"
            className="receipt-print-logo w-14 h-14 object-contain absolute left-0 top-0"
          />
          <div className="text-center flex-1 px-16">
            <h1 className="text-lg font-bold uppercase tracking-tight text-gray-900 leading-none mb-1">
              URBAN LOCAL BODIES
            </h1>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Tax Collection & Management System
            </p>
            <div className="ulb-details space-y-0.5">
              <h2 className="text-sm font-bold text-gray-800 uppercase leading-tight">{normalizedUlbDetails.name}</h2>
              {(normalizedUlbDetails.addressLine1 || normalizedUlbDetails.cityStatePincode) && (
                <p className="text-[9px] text-gray-500 leading-tight">
                  {[normalizedUlbDetails.addressLine1, normalizedUlbDetails.cityStatePincode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Title & Status Badge - Compact */}
        <div className="receipt-print-title-row flex flex-col items-center mb-2 relative">
          <h3 className="receipt-title text-base font-extrabold border-y-2 border-black py-0.5 px-8 uppercase tracking-widest bg-gray-50">
            {receiptTitle}
          </h3>
          <p className="text-[7px] text-gray-400 mt-0.5 uppercase tracking-[0.2em] font-bold">
            Original Copy / Digital Office Record
          </p>
          {status && (
            <div className={`mt-1.5 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase border-2 ${['paid', 'approved', 'active', 'completed'].includes(String(status).toLowerCase())
                ? 'bg-green-50 text-green-700 border-green-600'
                : 'bg-red-50 text-red-700 border-red-600'
              }`}>
              {status}
            </div>
          )}
        </div>
      </div>

      {/* Single outer frame; subsections separated by horizontal rules only */}
      <div className="receipt-body-box border-2 border-black overflow-hidden">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className={`section ${idx > 0 ? 'border-t-2 border-black' : ''}`}
          >
            <h4 className="section-title bg-gray-100 px-4 py-2 text-sm font-bold uppercase text-gray-800 border-b border-black">
              {section.title}
            </h4>
            <div className="section-body px-4 py-3">
              {Array.isArray(section.content) ? (
                <table className="w-full text-sm receipt-fields-table">
                  <tbody>
                    {section.content.map((row, rIdx) => (
                      <tr key={rIdx} className={`${rIdx % 2 === 0 ? '' : 'bg-gray-50/50'} ${row?.isAmountHighlight ? 'amount-row border-t border-black' : ''}`}>
                        <td className="py-1.5 px-3 font-semibold text-gray-600 w-2/5 border-b border-gray-100 uppercase text-[10px] align-top">
                          {row.label}
                        </td>
                        <td className={`py-1.5 px-3 text-gray-800 border-b border-gray-100 font-medium text-right align-top receipt-value-cell ${row?.isAmountHighlight ? 'text-sm font-bold' : 'text-[11px]'}`}>
                          {row.value || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                section.content
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer - Compact */}
      <div className="footer receipt-print-footer mt-6 pt-4 border-t border-dashed border-gray-300 text-right">
        <p className="text-[9px] text-gray-400 italic mb-0.5 uppercase">
          This is a system-generated receipt.
        </p>
        <p className="text-[10px] font-bold text-gray-600">
          Generated on: {timestamp}
        </p>

        <div className="mt-4 flex justify-between items-end">
          <div className="text-left">
            <p className="text-[8px] text-gray-400 mb-0.5">Scan to verify</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR" className="w-12 h-12 border p-0.5 bg-white" />
            ) : (
              <div className="w-12 h-12 bg-gray-50 flex items-center justify-center border text-[8px] text-gray-400">QR</div>
            )}
          </div>
          <div className="text-right receipt-print-barcode-wrap">
            <Barcode
              value={resolvedBarcodeValue}
              width={0.8}
              height={24}
              margin={0}
              displayValue={false}
              lineColor="#000"
              format="CODE128"
            />
            <p className="text-[8px] text-gray-400 mt-0.5 uppercase">Receipt ID: {resolvedBarcodeValue}</p>
          </div>
        </div>
      </div>

      {/* Global CSS for Print and Random 1 Fix */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #000 !important;
            font-family: Arial, sans-serif !important;
          }

          .no-print {
            display: none !important;
          }

          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 6px 8px !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            box-sizing: border-box !important;
          }

          /* Keep masthead together; do not force the large body box onto next page */
          .receipt-print-top {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .header {
            margin-bottom: 8px !important;
            padding-bottom: 8px !important;
            display: flex !important;
            align-items: center !important;
            gap: 15px !important;
          }
 
          .receipt-print-logo {
            width: 48px !important;
            height: 48px !important;
            margin: 0 !important;
          }
 
          .header h1 {
            font-size: 14px !important;
            line-height: 1 !important;
          }
 
          .header p {
            font-size: 10px !important;
            line-height: 1.1 !important;
          }
 
          .ulb-details {
            font-size: 9px !important;
            margin: 0 !important;
          }

          .ulb-details h2 {
            font-size: 12px !important;
            margin: 0 !important;
          }

          .receipt-print-title-row {
            margin-bottom: 8px !important;
          }

          .receipt-print-title-row .mt-4 {
            margin-top: 6px !important;
          }

          .receipt-title {
            font-size: 15px !important;
            color: black !important;
            background: #f9fafb !important;
            padding-top: 4px !important;
            padding-bottom: 4px !important;
            padding-left: 1.5rem !important;
            padding-right: 1.5rem !important;
          }

          .receipt-ulb-tag {
            font-size: 9px !important;
            margin-top: 4px !important;
            margin-bottom: 0 !important;
          }

          .receipt-body-box {
            border: 2px solid #000 !important;
            break-inside: auto;
            page-break-inside: auto;
          }

          .section {
            border: none !important;
            margin-bottom: 0 !important;
            padding: 0 !important;
          }

          .section-title {
            background: #e8eef5 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            padding: 3px 6px !important;
            font-size: 10px !important;
            margin-bottom: 0 !important;
            border-bottom: 1px solid #000 !important;
          }

          .section-body {
            padding: 3px 6px !important;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }

          td {
            padding: 3px 4px !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          .receipt-fields-table td {
            font-size: 10px !important;
          }

          .amount-row td {
             font-size: 11px !important;
             background: #fdfdfd !important;
             padding: 3px 4px !important;
          }

          .amount {
            font-size: 13px !important;
            font-weight: bold !important;
          }

          .receipt-print-footer {
            margin-top: 10px !important;
            padding-top: 6px !important;
          }
 
          .receipt-print-footer .mt-6 {
            margin-top: 10px !important;
          }

          .receipt-print-footer img[alt="Receipt verification QR code"] {
            width: 56px !important;
            height: 56px !important;
          }

          .receipt-print-barcode-wrap svg {
            max-height: 26px !important;
            width: auto !important;
          }

          .footer {
            font-size: 9px !important;
            text-align: right !important;
          }
          
          /* FIX "Random 1" Issue */
          ul, ol {
            list-style: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          *::marker {
            content: none !important;
          }

          *::before,
          *::after {
            content: none !important;
          }

          /* Ensure colors show in print */
          .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
          .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
          .bg-green-50 { background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; }
          .bg-red-50 { background-color: #fef2f2 !important; -webkit-print-color-adjust: exact; }
          .text-green-700 { color: #15803d !important; }
          .text-red-700 { color: #b91c1c !important; }
          .border-green-600 { border-color: #16a34a !important; }
          .border-red-600 { border-color: #dc2626 !important; }

          .receipt-watermark-overlay {
            display: flex !important;
            opacity: 0.05 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintReceiptLayout;
