import { useState, useEffect } from 'react';
import PrintReceiptLayout from './PrintReceiptLayout';
import api from '../services/api';

/** "Rs." + en-IN — avoids ₹ (U+20B9) rendering as superscript "¹" in print/PDF */
const formatReceiptAmount = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const useUlbDetails = (ulbId) => {
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUlb = async () => {
      if (!ulbId) return;
      try {
        setLoading(true);
        const response = await api.get('/admin-management/ulbs', { params: { includeInactive: 'true' } });
        const ulbs = Array.isArray(response.data) ? response.data : response.data?.data || [];
        const found = ulbs.find(u => u.id === ulbId);
        if (found) setDetails(found);
      } catch (error) {
        console.error('Failed to fetch ULB details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUlb();
  }, [ulbId]);

  return { details, loading };
};

export function PaymentReceiptView({ payment }) {
  const property = payment?.property;
  const owner = property?.owner || payment?.property?.owner;
  const ward = property?.ward;
  const demand = payment?.demand;
  const { details: ulbDetails } = useUlbDetails(payment?.ulb_id || property?.ulb_id);

  const sections = [
    {
      title: 'Receipt Details',
      content: [
        { label: 'Receipt Number', value: payment?.receiptNumber || payment?.paymentNumber },
        { label: 'Payment Date', value: payment?.paymentDate ? new Date(payment.paymentDate).toLocaleString('en-IN') : null },
        { label: 'Payment ID', value: payment?.paymentNumber },
        { label: 'Location', value: ward ? `${ward.wardNumber} - ${ward.wardName}` : null }
      ]
    },
    {
      title: 'Citizen & Entity',
      content: [
        { label: 'Citizen Name', value: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null },
        { label: 'Citizen Email', value: owner?.email },
        { label: 'Citizen Phone', value: owner?.phone },
        { label: 'Property Number', value: property?.propertyNumber },
        { label: 'Address', value: [property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ') }
      ]
    },
    {
      title: 'Amount Summary',
      content: [
        { label: 'Financial Year', value: demand?.financialYear },
        { label: 'Demand Number', value: demand?.demandNumber },
        { label: 'Payment Mode', value: payment?.paymentMode ? String(payment.paymentMode).toUpperCase() : null },
        { label: 'Amount Paid', value: formatReceiptAmount(payment?.amount) },
        { label: 'Final Amount', value: <span className="font-bold text-lg">{formatReceiptAmount(payment?.amount)}</span>, isAmountHighlight: true }
      ]
    }
  ];

  if (payment?.chequeNumber || payment?.transactionId) {
    sections[2].content.push({
      label: payment?.paymentMode === 'cheque' || payment?.paymentMode === 'dd' ? 'Cheque/DD Number' : 'Transaction ID',
      value: payment?.chequeNumber || payment?.transactionId
    });
  }

  if (payment?.cashier) {
    sections.push({
      title: 'Authority',
      content: [
        { label: 'Received By', value: `${payment.cashier.firstName} ${payment.cashier.lastName}` }
      ]
    });
  }

  return (
    <PrintReceiptLayout
      ulbDetails={ulbDetails}
      receiptTitle="PAYMENT RECEIPT"
      sections={sections}
      status={payment?.status || 'PAID'}
      receiptId={payment?.receiptNumber || payment?.paymentNumber || String(payment?.id || '')}
      barcodeValue={payment?.receiptNumber || payment?.paymentNumber || String(payment?.id || '')}
    />
  );
}

export function WaterPaymentReceiptView({ payment, waterBill, waterConnection, property }) {
  const owner = property?.owner;
  const connectionLabel = waterConnection?.connectionNumber
    ? (property?.propertyNumber ? `${waterConnection.connectionNumber} · ${property.propertyNumber}` : waterConnection.connectionNumber)
    : property?.propertyNumber;
  const { details: ulbDetails } = useUlbDetails(payment?.ulb_id || property?.ulb_id);

  const sections = [
    {
      title: 'Receipt Details',
      content: [
        { label: 'Receipt Number', value: payment?.receiptNumber || payment?.paymentNumber },
        { label: 'Payment Date', value: payment?.paymentDate ? new Date(payment.paymentDate).toLocaleString('en-IN') : null },
        { label: 'Payment ID', value: payment?.paymentNumber }
      ]
    },
    {
      title: 'Citizen & Entity',
      content: [
        { label: 'Citizen Name', value: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null },
        { label: 'Citizen Email', value: owner?.email },
        { label: 'Citizen Phone', value: owner?.phone },
        { label: 'Connection / Property', value: connectionLabel },
        { label: 'Address', value: [property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ') },
        { label: 'Bill Number', value: waterBill?.billNumber },
        { label: 'Billing Period', value: waterBill?.billingPeriod || 'N/A' }
      ]
    },
    {
      title: 'Amount Summary',
      content: [
        { label: 'Payment Mode', value: payment?.paymentMode ? String(payment.paymentMode).toUpperCase() : null },
        { label: 'Amount Paid', value: formatReceiptAmount(payment?.amount) },
        { label: 'Final Amount', value: <span className="font-bold text-lg">{formatReceiptAmount(payment?.amount)}</span>, isAmountHighlight: true }
      ]
    }
  ];

  if (payment?.chequeNumber || payment?.transactionId) {
    sections[2].content.push({
      label: payment?.paymentMode === 'cheque' || payment?.paymentMode === 'dd' ? 'Cheque/DD Number' : 'Transaction ID',
      value: payment?.chequeNumber || payment?.transactionId
    });
  }

  if (payment?.cashier) {
    sections.push({
      title: 'Authority',
      content: [
        { label: 'Received By', value: `${payment.cashier.firstName} ${payment.cashier.lastName}` }
      ]
    });
  }

  return (
    <PrintReceiptLayout
      ulbDetails={ulbDetails}
      receiptTitle="WATER PAYMENT RECEIPT"
      sections={sections}
      status={payment?.status || 'PAID'}
      receiptId={payment?.receiptNumber || payment?.paymentNumber || String(payment?.id || '')}
      barcodeValue={payment?.receiptNumber || payment?.paymentNumber || String(payment?.id || '')}
    />
  );
}

export function DemandNoticeView({ demand }) {
  const property = demand?.property;
  const owner = property?.owner;
  const { details: ulbDetails } = useUlbDetails(demand?.ulb_id || property?.ulb_id);

  const sections = [
    {
      title: 'Demand Details',
      content: [
        { label: 'Demand Number', value: demand?.demandNumber },
        { label: 'Financial Year', value: demand?.financialYear },
        { label: 'Demand Type', value: demand?.serviceType },
        { label: 'Due Date', value: demand?.dueDate ? new Date(demand.dueDate).toLocaleDateString('en-IN') : 'N/A' }
      ]
    },
    {
      title: 'Citizen & Entity',
      content: [
        { label: 'Property Number', value: property?.propertyNumber },
        { label: 'Citizen Name', value: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : property?.ownerName },
        { label: 'Citizen Email', value: owner?.email },
        { label: 'Citizen Phone', value: owner?.phone },
        { label: 'Address', value: [property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ') }
      ]
    },
    {
      title: 'Amount Summary',
      content: [
        { label: 'Base Amount', value: formatReceiptAmount(demand?.baseAmount) },
        { label: 'Arrears', value: formatReceiptAmount(demand?.arrearsAmount) },
        { label: 'Penalty', value: formatReceiptAmount(demand?.penaltyAmount) },
        { label: 'Interest', value: formatReceiptAmount(demand?.interestAmount) },
        { label: 'Total Demand', value: <span className="font-bold text-lg">{formatReceiptAmount(demand?.totalAmount)}</span>, isAmountHighlight: true },
        { label: 'Paid Amount', value: formatReceiptAmount(demand?.paidAmount) },
        { label: 'Final Amount', value: <span className="font-bold text-red-600 text-xl">{formatReceiptAmount(demand?.balanceAmount)}</span>, isAmountHighlight: true }
      ]
    }
  ];

  return (
    <PrintReceiptLayout
      ulbDetails={ulbDetails}
      receiptTitle="DEMAND NOTICE"
      sections={sections}
      status={demand?.status || 'UNPAID'}
      receiptId={demand?.demandNumber || String(demand?.id || '')}
      barcodeValue={demand?.demandNumber || String(demand?.id || '')}
    />
  );
}

export function DemandSummaryView({ demand }) {
  const property = demand?.property;
  const owner = property?.owner;
  const { details: ulbDetails } = useUlbDetails(demand?.ulb_id || property?.ulb_id);

  const sections = [
    {
      title: 'Demand Summary',
      content: [
        { label: 'Demand Number', value: demand?.demandNumber },
        { label: 'Financial Year', value: demand?.financialYear },
        { label: 'Property ID', value: property?.propertyNumber }
      ]
    },
    {
      title: 'Citizen & Entity',
      content: [
        { label: 'Property Number', value: property?.propertyNumber },
        { label: 'Citizen Name', value: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : property?.ownerName },
        { label: 'Citizen Email', value: owner?.email },
        { label: 'Citizen Phone', value: owner?.phone }
      ]
    },
    {
      title: 'Amount Summary',
      content: [
        { label: 'Total Demand', value: formatReceiptAmount(demand?.totalAmount) },
        { label: 'Amount Paid', value: formatReceiptAmount(demand?.paidAmount) },
        { label: 'Final Amount', value: <span className="font-bold text-red-600 text-lg">{formatReceiptAmount(demand?.balanceAmount)}</span>, isAmountHighlight: true }
      ]
    }
  ];

  if (demand.payments && demand.payments.length > 0) {
    sections.push({
      title: 'Recent Payments',
      content: demand.payments.slice(0, 3).map(p => ({
        label: `${p.receiptNumber} (${new Date(p.paymentDate).toLocaleDateString()})`,
        value: formatReceiptAmount(p.amount)
      }))
    });
  }

  return (
    <PrintReceiptLayout
      ulbDetails={ulbDetails}
      receiptTitle="DEMAND SUMMARY"
      sections={sections}
      status={demand?.status}
      receiptId={demand?.demandNumber || String(demand?.id || '')}
      barcodeValue={demand?.demandNumber || String(demand?.id || '')}
    />
  );
}
