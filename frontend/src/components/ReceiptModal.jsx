import { X, Printer, Download } from 'lucide-react';
import CommonReceipt from './CommonReceipt';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const ReceiptModal = ({ isOpen, onClose, data, type = 'PAYMENT' }) => {
  useLockBodyScroll(isOpen);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const receiptNumber = data.receiptNumber || data.paymentNumber || data.demandNumber || 'N/A';

  return (
    <>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
          <div
            className="modal-panel max-w-[800px] w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header flex justify-between items-center border-b p-3 bg-gray-50">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">Receipt Preview</h2>
                <span className="text-xs text-gray-500 font-mono">
                  {receiptNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="btn btn-secondary flex items-center py-1.5 px-3 text-sm"
                  title="Print Receipt"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="modal-body overflow-y-auto p-4 bg-white flex-1">
              <div className="receipt-container mx-auto">
                <CommonReceipt data={data} type={type} />
              </div>
            </div>

            <div className="modal-footer border-t p-3 bg-gray-50 flex justify-end gap-3 no-print">
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
              <button onClick={handlePrint} className="btn btn-primary flex items-center">
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container dedicated for printing when modal is NOT open */}
      <div className="print-only">
        <CommonReceipt data={data} type={type} />
      </div>

      <style>{`
        @media print {
          /* If modal is NOT open, we rely on the .print-only div.
             If modal IS open, we hide body and show the modal overlay. */
          ${isOpen ? `
            body > *:not(.modal-overlay) {
              display: none !important;
            }
            .modal-overlay {
              position: static !important;
              display: block !important;
              background: none !important;
              padding: 0 !important;
            }
            .modal-panel {
              box-shadow: none !important;
              max-width: none !important;
              max-height: none !important;
              width: 100% !important;
            }
            .modal-header, .modal-footer, .no-print {
              display: none !important;
            }
          ` : `
            /* When printing from main page button (modal closed) */
            .print-only {
              display: block !important;
            }
          `}
        }
      `}</style>
    </>
  );
};

export default ReceiptModal;
