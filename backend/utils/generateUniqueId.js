/**
 * Structured Unique ID generation across tax modules.
 * Format: PREFIX + WARD_CODE(3 digits) + PROPERTY_NUMBER(4 digits)
 *
 * Examples: PC0010001, PR0020015, WT0030100, ST0010025, DC0040008
 *
 * @param {string} type - 'residential'|'commercial'|'industrial'|'agricultural'|'mixed'|'water'|'shop'|'d2dc'
 * @param {number|string} wardNumber - ward id or number (padded to 3 digits)
 * @param {number|string} propertyNumber - numeric part (padded to 4 digits)
 * @returns {string} Formatted unique ID
 */
function generateUniqueId(type, wardNumber, propertyNumber) {
  const PREFIX = {
    residential: 'PR',
    commercial: 'PC',
    industrial: 'PI',
    agricultural: 'PA',
    mixed: 'PC',
    water: 'WT',
    shop: 'ST',
    d2dc: 'DC'
  };

  const prefix = PREFIX[String(type).toLowerCase()] || 'PC';
  const wardCode = String(Number(wardNumber) || 0).padStart(3, '0');
  const propNum = parseInt(propertyNumber, 10);
  const propertyPart = (isNaN(propNum) || propNum < 0 ? 0 : propNum).toString().padStart(4, '0');

  return `${prefix}${wardCode}${propertyPart}`;
}

export { generateUniqueId };
