import { generateUniqueId } from '../utils/generateUniqueId.js';
import { Property, WaterConnection, Shop, D2DCRecord, Ward, Assessment, WaterTaxAssessment, ShopTaxAssessment, Demand, Payment, WaterPayment } from '../models/index.js';
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
export async function generatePropertyUniqueId(wardId, propertyType, propertyNumber) {
  const ward = await Ward.findByPk(wardId);
  const wardNumDisplay = ward ? ward.wardNumber : wardId;
  const num = typeof propertyNumber === 'number' ? propertyNumber : parsePropertyNumberForId(propertyNumber);
  return generateUniqueId(propertyType, wardNumDisplay, num);
}

/**
 * Water Tax: WT + ward(3) + next number in ward (count of connections in ward + 1).
 * Validates uniqueness; retries once with next number if collision.
 */
export async function generateWaterConnectionId(wardId) {
  const ward = await Ward.findByPk(wardId);
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

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
    const candidate = generateUniqueId('water', wardNumDisplay, nextNum);
    const exists = await WaterConnection.findOne({ where: { connectionNumber: candidate } });
    if (!exists) return candidate;
  }
  return generateUniqueId('water', wardNumDisplay, count + 3);
}

/**
 * Shop Tax: ST + ward(3) + next number in ward (count + 1).
 * Validates uniqueness; retries once if collision.
 */
export async function generateShopId(wardId) {
  const ward = await Ward.findByPk(wardId);
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const count = await Shop.count({ where: { wardId } });
  for (let tryNum = 1; tryNum <= 2; tryNum++) {
    const nextNum = count + tryNum;
    const candidate = generateUniqueId('shop', wardNumDisplay, nextNum);
    const exists = await Shop.findOne({ where: { shopNumber: candidate } });
    if (!exists) return candidate;
  }
  return generateUniqueId('shop', wardNumDisplay, count + 3);
}

/**
 * D2DC: DC + ward(3) + next number in ward (count + 1).
 */
export async function generateD2DCId(wardId) {
  const ward = await Ward.findByPk(wardId);
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const count = await D2DCRecord.count({ where: { wardId } });
  return generateUniqueId('d2dc', wardNumDisplay, count + 1);
}

export async function generateAssessmentId(wardId, moduleType = 'property', transaction = null) {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const typeMap = {
    property: { model: Assessment, prefix: 'assessment' },
    water: { model: WaterTaxAssessment, prefix: 'water_assessment' },
    shop: { model: ShopTaxAssessment, prefix: 'shop_assessment' }
  };

  const config = typeMap[moduleType] || typeMap.property;
  // Note: Assessments are typically linked via propertyId, and property is in ward.
  // For shop, it's linked via shopId.
  let count;
  if (moduleType === 'property') {
    const propertyIds = await Property.findAll({ where: { wardId }, attributes: ['id'], transaction }).then(r => r.map(p => p.id));
    count = await Assessment.count({ where: { propertyId: { [Op.in]: propertyIds } }, transaction });
  } else if (moduleType === 'water') {
    const propertyIds = await Property.findAll({ where: { wardId }, attributes: ['id'], transaction }).then(r => r.map(p => p.id));
    count = await WaterTaxAssessment.count({ where: { propertyId: { [Op.in]: propertyIds } }, transaction });
  } else if (moduleType === 'shop') {
    const shopIds = await Shop.findAll({ where: { wardId }, attributes: ['id'], transaction }).then(r => r.map(s => s.id));
    count = await ShopTaxAssessment.count({ where: { shopId: { [Op.in]: shopIds } }, transaction });
  }

  return generateUniqueId(config.prefix, wardNumDisplay, count + 1, 4);
}

/**
 * Demand ID generation for Property (Unified), Water, Shop, and D2DC.
 */
export async function generateDemandId(wardId, moduleType = 'unified', transaction = null) {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const typeMap = {
    unified: { prefix: 'unified_demand' },
    property: { prefix: 'demand' },
    water: { prefix: 'water_demand' },
    shop: { prefix: 'shop_demand' },
    d2dc: { prefix: 'd2dc_demand' }
  };

  const config = typeMap[moduleType] || typeMap.unified;
  // Simple count of all demands in the ward for the service type
  const count = await Demand.count({
    include: [{ model: Property, as: 'property', where: { wardId } }],
    where: { serviceType: { [Op.not]: null } },
    transaction
  });

  return generateUniqueId(config.prefix, wardNumDisplay, count + 1, 4);
}

/**
 * Payment and Receipt ID generation.
 * Handles both general Payments and WaterPayments.
 */
export async function generatePaymentId(wardId, isReceipt = false, transaction = null, moduleType = 'general') {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const typeMap = {
    general: { model: Payment, payment: 'payment', receipt: 'receipt' },
    water: { model: WaterPayment, payment: 'water_payment', receipt: 'water_receipt' }
  };

  const config = typeMap[moduleType] || typeMap.general;
  const type = isReceipt ? config.receipt : config.payment;

  let count;
  if (moduleType === 'water') {
    count = await WaterPayment.count({
      include: [{
        model: WaterConnection,
        as: 'waterConnection',
        include: [{ model: Property, as: 'property', where: { wardId } }]
      }],
      transaction
    });
  } else {
    count = await Payment.count({
      include: [{ model: Property, as: 'property', where: { wardId } }],
      transaction
    });
  }

  return generateUniqueId(type, wardNumDisplay, count + 1, 6);
}

// Backward-compatible alias for property (used by controllers that pass wardId, propertyType only)
export async function generatePropertyId(wardId, propertyType, _transaction = null) {
  return await generatePropertyUniqueId(wardId, propertyType, 0);
}
