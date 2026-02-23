/**
 * Structured Unique ID generation across tax modules.
 * Format: PREFIX + WARD_CODE(3 digits) + SERIAL
 *
 * Examples: PC0010001, PR0020015, WT0030100, ST0010025, DC0040008, ASS0010001
 *
 * @param {string} type - 'residential'|'commercial'|'industrial'|'agricultural'|'mixed'|'water'|'shop'|'d2dc'|'assessment'|'water_assessment'|'shop_assessment'|'demand'|'water_demand'|'shop_demand'|'d2dc_demand'|'unified_demand'|'payment'|'receipt'
 * @param {number|string} wardNumber - ward id or number (padded to 3 digits)
 * @param {number|string} serialNumber - numeric part (padded to default 4 or custom digits)
 * @param {number} [serialLength=4] - padding length for serial number
 * @returns {string} Formatted unique ID
 */
function generateUniqueId(type, wardNumber, serialNumber, serialLength = 4) {
  const PREFIX = {
    residential: 'PR',
    commercial: 'PC',
    industrial: 'PI',
    agricultural: 'PA',
    mixed: 'PC',
    water: 'WT',
    shop: 'ST',
    d2dc: 'DC',
    assessment: 'ASS',
    water_assessment: 'WTA',
    shop_assessment: 'STA',
    demand: 'DEM',
    water_demand: 'WTD',
    shop_demand: 'STD',
    d2dc_demand: 'DDC',
    unified_demand: 'UDM',
    payment: 'PAY',
    receipt: 'RCP',
    water_payment: 'WPY',
    water_receipt: 'WRC'
  };

  const prefix = PREFIX[String(type).toLowerCase()] || type.toUpperCase().substring(0, 3);
  const wardCode = String(Number(wardNumber) || 0).padStart(3, '0');
  const serialNum = parseInt(serialNumber, 10);
  const serialPart = (isNaN(serialNum) || serialNum < 0 ? 0 : serialNum).toString().padStart(serialLength, '0');

  return `${prefix}${wardCode}${serialPart}`;
}

export { generateUniqueId };
