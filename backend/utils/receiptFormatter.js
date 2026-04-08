/**
 * Standardizes raw database values into a consistent receipt object.
 * Follows the government-grade format requirements:
 * - ULB Name, Ward, Citizen Name, Property Number
 * - Standardized Amount formatting
 * - Professional 'N/A' fallbacks
 */
export const formatReceiptData = (rawData, type = 'PAYMENT') => {
  if (!rawData) return null;

  const getValue = (val) => (val === null || val === undefined || val === '' ? 'N/A' : val);

  const data = {
    receiptTitle: type === 'NOTICE' ? 'DEMAND NOTICE' : (type === 'DEMAND' ? 'DEMAND RECEIPT' : 'PAYMENT RECEIPT'),
    status: getValue(rawData.status || rawData.payment_status).toString().replace(/_/g, ' ').toUpperCase(),
    receiptNumber: getValue(rawData.receiptNumber || rawData.receipt_number || rawData.paymentNumber || rawData.payment_number || rawData.demandNumber),
    ulbName: getValue(rawData.ulbName || (rawData.ulb ? rawData.ulb.name : (rawData.ulb_details ? rawData.ulb_details.name : null))),
    ward: getValue(rawData.ward || (rawData.ward_details ? `${rawData.ward_details.wardNumber} - ${rawData.ward_details.wardName}` : null)),
    paymentMethod: getValue(rawData.paymentMethod || rawData.paymentMode || rawData.payment_mode || 'N/A').toString().toUpperCase(),
    collectedBy: getValue(rawData.collectedBy || (rawData.cashier ? `${rawData.cashier.firstName} ${rawData.cashier.lastName}` : (rawData.collector ? `${rawData.collector.firstName} ${rawData.collector.lastName}` : null))),
    paymentDate: rawData.paymentDate || rawData.payment_date || rawData.createdAt,
    amount: parseFloat(rawData.amount || rawData.total_amount || 0),
    citizenName: getValue(rawData.citizenName || (rawData.owner ? `${rawData.owner.firstName} ${rawData.owner.lastName}` : (rawData.citizen_name || null))),
    propertyNumber: getValue(rawData.propertyNumber || (rawData.property ? rawData.property.propertyNumber : (rawData.property_number || null))),
    
    // Maintain internal raw fields just in case
    raw: rawData
  };

  // Sections for the UI
  data.sections = [
    {
      title: 'Receipt Details',
      content: [
        { label: 'ULB Name', value: data.ulbName },
        { label: 'Ward / Area', value: data.ward },
        { label: 'Receipt Number', value: data.receiptNumber },
        { label: 'Payment Date', value: data.paymentDate ? new Date(data.paymentDate).toLocaleString('en-IN') : 'N/A' },
        { label: 'Payment ID', value: data.receiptNumber }
      ]
    },
    {
      title: 'Citizen & Entity',
      content: [
        { label: 'Citizen Name', value: data.citizenName },
        { label: 'Property Number', value: data.propertyNumber },
        { label: 'Address', value: getValue(rawData.address || (rawData.property ? rawData.property.address : null)) }
      ]
    },
    {
      title: 'Amount Summary',
      content: [
        { label: 'Payment Mode', value: data.paymentMethod },
        { label: 'Amount Paid', value: `Rs. ${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        { label: 'Final Amount', value: `Rs. ${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, isAmountHighlight: true }
      ]
    },
    {
      title: 'Additional Details',
      content: [
        { label: 'Collected By', value: data.collectedBy }
      ]
    }
  ];

  return data;
};
