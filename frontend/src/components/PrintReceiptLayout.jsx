import React from 'react';

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
  timestamp = new Date().toLocaleString()
}) => {
  return (
    <div className="print-container bg-white p-8 max-w-[800px] mx-auto shadow-md">
      {/* Header Enhancement */}
      <div className="header text-center mb-8 border-b pb-6">
        <div className="flex flex-col items-center gap-2">
          <img 
            src="/ULB Logo.png" 
            alt="ULB Logo" 
            className="w-20 h-20 object-contain mb-2"
          />
          <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900 leading-tight">
            URBAN LOCAL BODIES
          </h1>
          <p className="text-sm font-medium text-gray-700 uppercase tracking-wider mb-2">
            Tax Collection & Management System
          </p>
          
          <div className="ulb-details mt-2 space-y-1">
            <h2 className="text-lg font-bold text-gray-800 uppercase">{ulbDetails.name}</h2>
            {ulbDetails.address_line_1 && <p className="text-xs text-gray-600 leading-relaxed">{ulbDetails.address_line_1}</p>}
            {ulbDetails.address_line_2 && <p className="text-xs text-gray-600 leading-relaxed">{ulbDetails.address_line_2}</p>}
            <p className="text-xs text-gray-600 leading-relaxed">
              {ulbDetails.district && `${ulbDetails.district}, `}
              {ulbDetails.state && `${ulbDetails.state}`}
              {ulbDetails.pincode && ` - ${ulbDetails.pincode}`}
            </p>
            {(ulbDetails.phone || ulbDetails.email) && (
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">
                {ulbDetails.phone && `Phone: ${ulbDetails.phone}`}
                {ulbDetails.phone && ulbDetails.email && ' | '}
                {ulbDetails.email && `Email: ${ulbDetails.email}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Title & Status Badge */}
      <div className="flex flex-col items-center mb-8 relative">
        <h3 className="receipt-title text-xl font-bold border-y-2 border-black py-2 px-12 uppercase tracking-widest bg-gray-50">
          {receiptTitle}
        </h3>
        {status && (
          <div className={`mt-4 px-4 py-1 rounded-full text-xs font-bold uppercase border-2 ${
            status.toLowerCase() === 'paid' || status.toLowerCase() === 'approved' || status.toLowerCase() === 'active'
              ? 'bg-green-50 text-green-700 border-green-600' 
              : 'bg-red-50 text-red-700 border-red-600'
          }`}>
            {status}
          </div>
        )}
      </div>

      {/* Structured Sections */}
      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx} className="section border border-gray-300 rounded overflow-hidden">
            <h4 className="section-title bg-gray-100 px-4 py-2 text-sm font-bold uppercase text-gray-800 border-b border-gray-300">
              {section.title}
            </h4>
            <div className="p-4">
              {Array.isArray(section.content) ? (
                <table className="w-full text-sm">
                  <tbody>
                    {section.content.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 0 ? '' : 'bg-gray-50'}>
                        <td className="py-2.5 px-3 font-semibold text-gray-600 w-1/3 border-b border-gray-100 uppercase text-[11px]">
                          {row.label}
                        </td>
                        <td className="py-2.5 px-3 text-gray-800 border-b border-gray-100 font-medium">
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
      <div className="footer mt-12 pt-6 border-t border-dashed border-gray-400 text-right">
        <p className="text-[10px] text-gray-500 italic mb-1 uppercase font-medium">
          This is a system-generated document and does not require a physical signature.
        </p>
        <p className="text-[10px] font-bold text-gray-600 tracking-wider">
          Generated on: {timestamp}
        </p>
        
        <div className="mt-6 flex justify-between items-end opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all no-print">
          <div className="text-left">
            <p className="text-[8px] text-gray-400 mb-1">Scan for verification</p>
            <div className="w-16 h-16 bg-gray-200 flex items-center justify-center border-2 border-gray-300 rounded">
              <span className="text-[10px] text-gray-400 font-bold">QR CODE</span>
            </div>
          </div>
          <div className="text-right">
             <div className="h-8 w-40 bg-gray-200 border-x-2 border-gray-300 relative flex items-center justify-center overflow-hidden">
                <div className="w-full h-full flex items-center justify-around px-1">
                   {[...Array(20)].map((_, i) => (
                     <div key={i} className={`h-full bg-gray-400 ${i % 2 === 0 ? 'w-[1px]' : 'w-[2px]'}`} />
                   ))}
                </div>
             </div>
             <p className="text-[8px] text-gray-400 mt-1 uppercase font-medium">Digital Barcode</p>
          </div>
        </div>
      </div>
      
      {/* Global CSS for Print and Random 1 Fix */}
      <style>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #000 !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
          }

          .no-print {
            display: none !important;
          }

          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 40px !important;
            box-shadow: none !important;
            border: none !important;
          }

          .header {
            margin-bottom: 25px !important;
          }

          .ulb-details {
            font-size: 13px !important;
            margin-top: 8px !important;
            line-height: 1.5 !important;
          }

          .receipt-title {
            font-size: 20px !important;
            color: black !important;
            background: #f9fafb !important;
          }

          .section {
            border: 1px solid #e5e7eb !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
          }

          .section-title {
            background: #f3f4f6 !important;
            color: #111827 !important;
            -webkit-print-color-adjust: exact;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          td {
            padding: 8px 12px !important;
            border-bottom: 1px solid #f3f4f6 !important;
          }

          .amount-row td {
             font-size: 18px !important;
             font-weight: bold !important;
             color: black !important;
             background: #fdfdfd !important;
          }

          .footer {
            margin-top: 40px !important;
          }
          
          /* FIX "Random 1" Issue */
          ol, li {
            list-style: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          *::marker {
            content: none !important;
          }

          *::before, *::after {
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
