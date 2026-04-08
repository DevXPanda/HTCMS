import { useMemo } from 'react';
import PrintReceiptLayout from './PrintReceiptLayout';
import { formatReceiptData } from '../utils/receiptFormatter';

/**
 * CommonReceipt - The single source of truth for all receipts in the project.
 * Standardizes UI across Property, Water, Shop Tax, Demands, etc.
 * 
 * @param {Object} data - Raw data from API (Payment, Demand, etc.)
 * @param {string} type - 'PAYMENT', 'DEMAND', 'NOTICE'
 */
const CommonReceipt = ({ data, type = 'PAYMENT' }) => {
  const formatted = useMemo(() => formatReceiptData(data, type), [data, type]);

  if (!formatted) return null;

  return (
    <PrintReceiptLayout
      ulbDetails={{ name: formatted.ulbName }}
      receiptTitle={formatted.receiptTitle}
      sections={formatted.sections}
      status={formatted.status}
      receiptId={formatted.receiptNumber}
      barcodeValue={formatted.receiptNumber}
      timestamp={new Date(formatted.paymentDate).toLocaleString('en-IN')}
    />
  );
};

export default CommonReceipt;
