import { generateUniqueId } from '../utils/generateUniqueId.js';
import { Property, WaterConnection, Shop, D2DCRecord } from '../models/index.js';
import { Op } from 'sequelize';

/** Property type to prefix (House Tax). */
export const PROPERTY_TYPE_CODE = {
  residential: 'PR',
  commercial: 'PC',
  industrial: 'PI',
  agricultural: 'PA',
  mixed: 'PC'
};

/**
 * Parse property number from admin input to integer for unique ID (4-digit part).
 * Handles numeric strings, existing format PR0010025 (extracts 25), or returns 0.
 */
export function parsePropertyNumberForId(propertyNumber) {
  if (propertyNumber == null || propertyNumber === '') return 0;
  const s = String(propertyNumber).trim();
  const match = s.match(/^(?:PR|PC|PI|PA)\d{3}(\d{4})$/);
  if (match) return parseInt(match[1], 10) || 0;
  const num = parseInt(s, 10);
  return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * Next available property number (4-digit part) in a ward for auto-assign when admin does not provide one.
 */
export async function getNextPropertyNumberInWard(wardId) {
  const properties = await Property.findAll({
    where: { wardId },
    attributes: ['uniqueCode']
  });
  let maxNum = 0;
  for (const p of properties) {
    const code = p.uniqueCode || '';
    const m = code.match(/\d{3}(\d{4})$/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return maxNum + 1;
}

/**
 * House Tax (Property): generate unique code from type, ward, and property number.
 * No serial/sequence; uses admin property number (or next in ward when not provided).
 */
export function generatePropertyUniqueId(wardId, propertyType, propertyNumber) {
  const num = typeof propertyNumber === 'number' ? propertyNumber : parsePropertyNumberForId(propertyNumber);
  return generateUniqueId(propertyType, wardId, num);
}

/**
 * Water Tax: WT + ward(3) + next number in ward (count of connections in ward + 1).
 * Validates uniqueness; retries once with next number if collision.
 */
export async function generateWaterConnectionId(wardId) {
  const propertyIds = await Property.findAll({
    where: { wardId },
    attributes: ['id']
  }).then(rows => rows.map(r => r.id));
  const count = propertyIds.length
    ? await WaterConnection.count({
      where: { propertyId: { [Op.in]: propertyIds } }
    })
    : 0;
  for (let tryNum = 1; tryNum <= 2; tryNum++) {
    const nextNum = count + tryNum;
    const candidate = generateUniqueId('water', wardId, nextNum);
    const exists = await WaterConnection.findOne({ where: { connectionNumber: candidate } });
    if (!exists) return candidate;
  }
  return generateUniqueId('water', wardId, count + 3);
}

/**
 * Shop Tax: ST + ward(3) + next number in ward (count + 1).
 * Validates uniqueness; retries once if collision.
 */
export async function generateShopId(wardId) {
  const count = await Shop.count({ where: { wardId } });
  for (let tryNum = 1; tryNum <= 2; tryNum++) {
    const candidate = generateUniqueId('shop', wardId, count + tryNum);
    const exists = await Shop.findOne({ where: { shopNumber: candidate } });
    if (!exists) return candidate;
  }
  return generateUniqueId('shop', wardId, count + 3);
}

/**
 * D2DC: DC + ward(3) + next number in ward (count + 1).
 */
export async function generateD2DCId(wardId) {
  const count = await D2DCRecord.count({ where: { wardId } });
  return generateUniqueId('d2dc', wardId, count + 1);
}

// Backward-compatible alias for property (used by controllers that pass wardId, propertyType only)
export async function generatePropertyId(wardId, propertyType, _transaction = null) {
  return generatePropertyUniqueId(wardId, propertyType, 0);
}
