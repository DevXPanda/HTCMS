import { formatCurrencyCr } from './numberFormatters';

/**
 * Shared utility to format raw receipt data consistently across the frontend.
 * Ensures uniform naming conventions and applies 'N/A' fallbacks.
 */
export const formatReceiptData = (rawData, type = 'PAYMENT') => {
  if (!rawData) return null;

  const getValue = (val) => (val === null || val === undefined || val === '' ? 'N/A' : val);

  // Determine the correct data source for property info
  const property = rawData.property || 
                   (rawData.waterConnection?.property) || 
                   (rawData.shop?.property) || 
                   (rawData.demand?.property) || 
                   {};

  const owner = rawData.owner || 
                property.owner || 
                (rawData.waterConnection?.owner) || 
                (rawData.shop?.owner) || 
                {};

  const ward = property.ward || 
               (rawData.ward) || 
               (rawData.shop?.ward) || 
               {};

  const cityState = [property.city || 'NA', property.state || 'NA'].filter(Boolean).join(', ');

  const data = {
    receiptTitle: rawData.receiptTitle || (type === 'NOTICE' ? 'DEMAND NOTICE' : (type === 'DEMAND' ? 'DEMAND SUMMARY' : 'PAYMENT RECEIPT')),
    status: getValue(rawData.status || rawData.paymentStatus || 'PAID').toString().replace(/_/g, ' ').toUpperCase(),
    receiptNumber: getValue(rawData.receiptNumber || rawData.paymentNumber || rawData.demandNumber),
    ulbName: getValue(rawData.ulbName || (rawData.ulb?.name) || 'Urban Local Body'),
    ward: getValue(rawData.wardName || (ward.wardNumber ? `${ward.wardNumber} - ${ward.wardName}` : null)),
    paymentMethod: getValue(rawData.paymentMethod || (rawData.paymentMode ? String(rawData.paymentMode).toUpperCase() : null)),
    collectedBy: getValue(rawData.collectedBy || (rawData.cashier ? `${rawData.cashier.firstName} ${rawData.cashier.lastName}` : null)),
    paymentDate: rawData.paymentDate || rawData.createdAt || new Date(),
    amount: parseFloat(rawData.amount || rawData.totalAmount || 0),
    citizenName: getValue(rawData.citizenName || (owner.firstName ? `${owner.firstName} ${owner.lastName}` : null)),
    propertyNumber: getValue(rawData.propertyNumber || property.propertyNumber),
    address: getValue(rawData.address || [property.address, cityState, property.pincode].filter(Boolean).join(', '))
  };

  // Build standardized sections
  data.sections = [
    {
      title: 'Receipt Details',
      content: [
        { label: 'ULB Name', value: data.ulbName },
        { label: 'Ward / Area', value: data.ward },
        { label: 'Receipt Number', value: data.receiptNumber },
        { label: 'Date', value: new Date(data.paymentDate).toLocaleString('en-IN') },
        { label: 'ID', value: data.receiptNumber }
      ]
    },
    {
      title: 'Citizen & Entity',
      content: [
        { label: 'Citizen Name', value: data.citizenName },
        { label: 'Property / Entity ID', value: data.propertyNumber },
        { label: 'Address', value: data.address }
      ]
    },
    {
      title: 'Amount Summary',
      content: [
        { label: 'Payment Mode', value: data.paymentMethod },
        { label: 'Amount Paid', value: formatCurrencyCr(data.amount) },
        { label: 'Final Amount', value: formatCurrencyCr(data.amount), isAmountHighlight: true }
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
