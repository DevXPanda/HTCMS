import { X, Printer, Download } from 'lucide-react';
import CommonReceipt from './CommonReceipt';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const ReceiptModal = ({ isOpen, onClose, data, type = 'PAYMENT' }) => {
  useLockBodyScroll(isOpen);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
          <div
            className="modal-panel max-w-[850px] w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimal header with only Close button, no background/border gap */}
            <div className="flex justify-end p-2 bg-white no-print">
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content area with 0 top padding to ensure receipt starts immediately */}
            <div className="modal-body overflow-y-auto p-0 bg-gray-50/50 flex-1">
              <div className="receipt-container mx-auto pt-0 pb-6 px-2 sm:px-8">
                <CommonReceipt data={data} type={type} />
              </div>
            </div>

            {/* Bottom action bar - keep only one print button and close */}
            <div className="modal-footer border-t p-4 bg-white flex justify-end gap-3 no-print">
              <button onClick={onClose} className="btn btn-secondary border-none hover:bg-gray-100">
                Close
              </button>
              <button onClick={handlePrint} className="btn btn-primary px-6 flex items-center shadow-md">
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
          ${isOpen ? `
            body > *:not(.modal-overlay) {
              display: none !important;
            }
            .modal-overlay {
              position: static !important;
              display: block !important;
              background: none !important;
              padding: 0 !important;
              visibility: visible !important;
            }
            .modal-panel {
              box-shadow: none !important;
              border: none !important;
              max-width: none !important;
              max-height: none !important;
              width: 100% !important;
              overflow: visible !important;
              display: block !important;
            }
            .modal-header, .no-print, .modal-footer {
              display: none !important;
            }
            .modal-body {
              padding: 0 !important;
              overflow: visible !important;
              display: block !important;
            }
          ` : `
            .print-only {
              display: block !important;
              width: 100% !important;
            }
          `}
        }
      `}</style>
    </>
  );
};

export default ReceiptModal;
