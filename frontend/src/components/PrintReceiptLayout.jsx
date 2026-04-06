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
    <div className="print-container bg-white p-8 max-w-[800px] mx-auto shadow-md border-2 border-black">
      <div className="receipt-print-top">
        {/* Header Enhancement */}
        <div className="header text-center mb-8 border-b pb-6">
          <div className="flex flex-col items-center gap-2">
            <img
              src="/ULB Logo.png"
              alt="ULB Logo"
              className="receipt-print-logo w-20 h-20 object-contain mb-2"
            />
            <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900 leading-tight">
              URBAN LOCAL BODIES
            </h1>
            <p className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-2">
              Tax Collection & Management System
            </p>

            <div className="ulb-details mt-2 space-y-1">
              <h2 className="text-lg font-bold text-gray-800 uppercase">{normalizedUlbDetails.name}</h2>
              {normalizedUlbDetails.addressLine1 && <p className="text-xs text-gray-600 leading-relaxed">{normalizedUlbDetails.addressLine1}</p>}
              {normalizedUlbDetails.addressLine2 && <p className="text-xs text-gray-600 leading-relaxed">{normalizedUlbDetails.addressLine2}</p>}
              {normalizedUlbDetails.cityStatePincode && (
                <p className="text-xs text-gray-600 leading-relaxed">{normalizedUlbDetails.cityStatePincode}</p>
              )}
              {normalizedUlbDetails.contactLine && (
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">
                  {normalizedUlbDetails.contactLine}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Title & Status Badge */}
        <div className="receipt-print-title-row flex flex-col items-center mb-8 relative">
          <h3 className="receipt-title text-xl font-bold border-y-2 border-black py-2 px-12 uppercase tracking-widest bg-gray-50">
            {receiptTitle}
          </h3>
          <p className="receipt-ulb-tag mt-2 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
            ULB: {normalizedUlbDetails.name}
          </p>
          {status && (
            <div className={`mt-4 px-4 py-1 rounded-full text-xs font-bold uppercase border-2 ${['paid', 'approved', 'active', 'completed'].includes(String(status).toLowerCase())
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
                      <tr key={rIdx} className={`${rIdx % 2 === 0 ? '' : 'bg-gray-50'} ${row?.isAmountHighlight ? 'amount-row' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-gray-600 w-2/5 border-b border-gray-200 uppercase text-[11px] align-top">
                          {row.label}
                        </td>
                        <td className={`py-2.5 px-3 text-gray-800 border-b border-gray-200 font-medium text-right align-top receipt-value-cell ${row?.isAmountHighlight ? 'amount' : ''}`}>
                          {row.value || 'N/A'}
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

      {/* Footer */}
      <div className="footer receipt-print-footer mt-12 pt-6 border-t border-dashed border-gray-400 text-right">
        <p className="text-[10px] text-gray-500 italic mb-1 uppercase font-medium">
          This is a system-generated receipt.
        </p>
        <p className="text-[10px] font-bold text-gray-600 tracking-wider">
          Generated on: {timestamp}
        </p>

        <div className="mt-6 flex justify-between items-end">
          <div className="text-left">
            <p className="text-[8px] text-gray-400 mb-1">Scan for verification</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Receipt verification QR code" className="w-16 h-16 border border-gray-300 p-0.5 bg-white" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center border border-gray-300 rounded">
                <span className="text-[10px] text-gray-400 font-bold">QR</span>
              </div>
            )}
          </div>
          <div className="text-right receipt-print-barcode-wrap">
            <Barcode
              value={resolvedBarcodeValue}
              width={1}
              height={32}
              margin={0}
              displayValue={false}
              lineColor="#111827"
              background="#ffffff"
              format="CODE128"
            />
            <p className="text-[8px] text-gray-500 mt-1 uppercase font-medium">Receipt ID: {resolvedBarcodeValue}</p>
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
            margin-bottom: 6px !important;
            padding-bottom: 6px !important;
          }

          .receipt-print-logo {
            width: 52px !important;
            height: 52px !important;
            margin-bottom: 2px !important;
          }

          .header h1 {
            font-size: 16px !important;
            margin: 0 !important;
            line-height: 1.15 !important;
          }

          .header p {
            margin: 0 !important;
            line-height: 1.2 !important;
          }

          .ulb-details {
            font-size: 10px !important;
            margin-top: 4px !important;
            line-height: 1.25 !important;
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
            padding: 4px 6px !important;
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
             font-size: 13px !important;
             font-weight: bold !important;
             color: black !important;
             background: #f9fafb !important;
             padding: 4px !important;
          }

          .amount {
            font-size: 13px !important;
            font-weight: bold !important;
          }

          .receipt-print-footer {
            margin-top: 8px !important;
            padding-top: 8px !important;
          }

          .receipt-print-footer .mt-6 {
            margin-top: 8px !important;
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
        }
      `}</style>
    </div>
  );
};

export default PrintReceiptLayout;
