import React, { useState, useEffect } from 'react';
import PrintReceiptLayout from './PrintReceiptLayout';
import api from '../services/api';

const formatCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export function PaymentReceiptView({ payment, formatAmt = formatCurrency }) {
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
      title: 'Property Details',
      content: [
        { label: 'Property Number', value: property?.propertyNumber },
        { label: 'Address', value: [property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ') }
      ]
    },
    {
      title: 'Owner Details',
      content: [
        { label: 'Name', value: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null },
        { label: 'Email', value: owner?.email },
        { label: 'Phone', value: owner?.phone }
      ]
    },
    {
      title: 'Payment Details',
      content: [
        { label: 'Financial Year', value: demand?.financialYear },
        { label: 'Demand Number', value: demand?.demandNumber },
        { label: 'Payment Mode', value: payment?.paymentMode ? String(payment.paymentMode).toUpperCase() : null },
        { label: 'Amount Paid', value: formatAmt(payment?.amount) },
        { label: 'Total Paid', value: <span className="font-bold underline">{formatAmt(payment?.amount)}</span> }
      ]
    }
  ];

  if (payment?.chequeNumber || payment?.transactionId) {
    sections[3].content.push({
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
    />
  );
}

export function WaterPaymentReceiptView({ payment, waterBill, waterConnection, property, formatAmt = formatCurrency }) {
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
      title: 'Connection & Property',
      content: [
        { label: 'Connection / Property', value: connectionLabel },
        { label: 'Address', value: [property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ') },
        { label: 'Bill Number', value: waterBill?.billNumber },
        { label: 'Billing Period', value: waterBill?.billingPeriod || 'N/A' }
      ]
    },
    {
      title: 'Owner Details',
      content: [
        { label: 'Name', value: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null },
        { label: 'Email', value: owner?.email },
        { label: 'Phone', value: owner?.phone }
      ]
    },
    {
      title: 'Payment Details',
      content: [
        { label: 'Payment Mode', value: payment?.paymentMode ? String(payment.paymentMode).toUpperCase() : null },
        { label: 'Amount Paid', value: formatAmt(payment?.amount) },
        { label: 'Total Paid', value: <span className="font-bold underline text-lg">{formatAmt(payment?.amount)}</span> }
      ]
    }
  ];

  if (payment?.chequeNumber || payment?.transactionId) {
    sections[3].content.push({
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
    />
  );
}

export function DemandNoticeView({ demand, formatAmt = formatCurrency }) {
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
      title: 'Property & Owner',
      content: [
        { label: 'Property Number', value: property?.propertyNumber },
        { label: 'Owner Name', value: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : property?.ownerName },
        { label: 'Address', value: [property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ') }
      ]
    },
    {
      title: 'Amount Summary',
      content: [
        { label: 'Base Amount', value: formatAmt(demand?.baseAmount) },
        { label: 'Arrears', value: formatAmt(demand?.arrearsAmount) },
        { label: 'Penalty', value: formatAmt(demand?.penaltyAmount) },
        { label: 'Interest', value: formatAmt(demand?.interestAmount) },
        { label: 'Total Demand', value: <span className="font-bold underline text-lg">{formatAmt(demand?.totalAmount)}</span> },
        { label: 'Paid Amount', value: formatAmt(demand?.paidAmount) },
        { label: 'Balance Payable', value: <span className="font-bold text-red-600 text-xl">{formatAmt(demand?.balanceAmount)}</span> }
      ]
    }
  ];

  return (
    <PrintReceiptLayout
      ulbDetails={ulbDetails}
      receiptTitle="DEMAND NOTICE"
      sections={sections}
      status={demand?.status || 'UNPAID'}
    />
  );
}

export function DemandSummaryView({ demand, formatAmt = formatCurrency }) {
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
      title: 'Payment Status',
      content: [
        { label: 'Total Demand', value: formatAmt(demand?.totalAmount) },
        { label: 'Amount Paid', value: formatAmt(demand?.paidAmount) },
        { label: 'Balance Due', value: <span className="font-bold text-red-600">{formatAmt(demand?.balanceAmount)}</span> }
      ]
    }
  ];

  if (demand.payments && demand.payments.length > 0) {
    sections.push({
      title: 'Recent Payments',
      content: demand.payments.slice(0, 3).map(p => ({
        label: `${p.receiptNumber} (${new Date(p.paymentDate).toLocaleDateString()})`,
        value: formatAmt(p.amount)
      }))
    });
  }

  return (
    <PrintReceiptLayout
      ulbDetails={ulbDetails}
      receiptTitle="DEMAND SUMMARY"
      sections={sections}
      status={demand?.status}
    />
  );
}
