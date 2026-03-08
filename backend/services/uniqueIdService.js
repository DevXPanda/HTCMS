import { generateUniqueId } from '../utils/generateUniqueId.js';
import { Property, WaterConnection, WaterBill, WaterMeterReading, WaterConnectionRequest, ShopRegistrationRequest, Shop, D2DCRecord, Ward, Assessment, WaterTaxAssessment, ShopTaxAssessment, Demand, Payment, WaterPayment, Notice } from '../models/index.js';
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
 * Water Bill: WB + ward(3) + serial(4). Same unique code format as Property (PR), Connection (WT).
 * Counts bills for connections in this ward; ensures uniqueness with retry loop.
 */
export async function generateWaterBillNumber(wardId, transaction = null) {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const propertyIds = await Property.findAll({
    where: { wardId },
    attributes: ['id'],
    transaction
  }).then(rows => rows.map(r => r.id));
  const connectionIds = propertyIds.length
    ? await WaterConnection.findAll({
      where: { propertyId: { [Op.in]: propertyIds } },
      attributes: ['id'],
      transaction
    }).then(rows => rows.map(r => r.id))
    : [];
  const count = connectionIds.length
    ? await WaterBill.count({
      where: { waterConnectionId: { [Op.in]: connectionIds } },
      transaction
    })
    : 0;

  let nextNum = count + 1;
  let candidate = generateUniqueId('water_bill', wardNumDisplay, nextNum);
  let exists = await WaterBill.findOne({ where: { billNumber: candidate }, transaction });
  while (exists) {
    nextNum++;
    candidate = generateUniqueId('water_bill', wardNumDisplay, nextNum);
    exists = await WaterBill.findOne({ where: { billNumber: candidate }, transaction });
  }
  return candidate;
}

/**
 * Water Meter Reading: WR + ward(3) + serial(4). Same unique code format as Property (PR), Connection (WT), Bill (WB).
 * Counts meter readings for connections in this ward; ensures uniqueness with retry loop.
 */
export async function generateWaterMeterReadingNumber(wardId, transaction = null) {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const propertyIds = await Property.findAll({
    where: { wardId },
    attributes: ['id'],
    transaction
  }).then(rows => rows.map(r => r.id));
  const connectionIds = propertyIds.length
    ? await WaterConnection.findAll({
      where: { propertyId: { [Op.in]: propertyIds } },
      attributes: ['id'],
      transaction
    }).then(rows => rows.map(r => r.id))
    : [];
  const count = connectionIds.length
    ? await WaterMeterReading.count({
      where: { waterConnectionId: { [Op.in]: connectionIds } },
      transaction
    })
    : 0;

  let nextNum = count + 1;
  let candidate = generateUniqueId('water_reading', wardNumDisplay, nextNum);
  let exists = await WaterMeterReading.findOne({ where: { readingNumber: candidate }, transaction });
  while (exists) {
    nextNum++;
    candidate = generateUniqueId('water_reading', wardNumDisplay, nextNum);
    exists = await WaterMeterReading.findOne({ where: { readingNumber: candidate }, transaction });
  }
  return candidate;
}

/**
 * Water Connection Request: WCR + ward(3) + serial(4). Same unique code format as Property (PR), Connection (WT), Bill (WB).
 * Counts requests for properties in this ward; ensures uniqueness with retry loop.
 */
export async function generateWaterConnectionRequestNumber(wardId, transaction = null) {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const propertyIds = await Property.findAll({
    where: { wardId },
    attributes: ['id'],
    transaction
  }).then(rows => rows.map(r => r.id));

  const count = propertyIds.length
    ? await WaterConnectionRequest.count({
      where: { propertyId: { [Op.in]: propertyIds } },
      transaction
    })
    : 0;

  let nextNum = count + 1;
  let candidate = generateUniqueId('water_connection_request', wardNumDisplay, nextNum);
  let exists = await WaterConnectionRequest.findOne({ where: { requestNumber: candidate }, transaction });
  while (exists) {
    nextNum++;
    candidate = generateUniqueId('water_connection_request', wardNumDisplay, nextNum);
    exists = await WaterConnectionRequest.findOne({ where: { requestNumber: candidate }, transaction });
  }
  return candidate;
}

/**
 * Shop Registration Request: SRR + ward(3) + serial(4). Same unique code format as other modules.
 */
export async function generateShopRegistrationRequestId(wardId, transaction = null) {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;

  const propertyIds = await Property.findAll({
    where: { wardId },
    attributes: ['id'],
    transaction
  }).then(rows => rows.map(r => r.id));
  const count = propertyIds.length
    ? await ShopRegistrationRequest.count({
      where: { propertyId: { [Op.in]: propertyIds } },
      transaction
    })
    : 0;

  let nextNum = count + 1;
  let candidate = generateUniqueId('shop_registration_request', wardNumDisplay, nextNum, 4);
  let exists = await ShopRegistrationRequest.findOne({ where: { requestNumber: candidate }, transaction });
  while (exists) {
    nextNum++;
    candidate = generateUniqueId('shop_registration_request', wardNumDisplay, nextNum, 4);
    exists = await ShopRegistrationRequest.findOne({ where: { requestNumber: candidate }, transaction });
  }
  return candidate;
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
 * Uses max serial per ward+prefix and retry loop to guarantee unique codes (safe for bulk/concurrent).
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
  const prefixKey = config.prefix;
  // Resolve prefix string for this ward (e.g. DEM023, WTD023)
  const prefixStr = generateUniqueId(prefixKey, wardNumDisplay, 0, 4).replace(/\d{4}$/, '');
  const demands = await Demand.findAll({
    where: { demandNumber: { [Op.like]: `${prefixStr}%` } },
    attributes: ['demandNumber'],
    raw: true,
    transaction
  });
  let maxSerial = 0;
  const serialLen = 4;
  for (const d of demands) {
    const numPart = d.demandNumber.slice(prefixStr.length);
    if (new RegExp(`^\\d{${serialLen}}$`).test(numPart)) {
      const s = parseInt(numPart, 10);
      if (s > maxSerial) maxSerial = s;
    }
  }
  let nextNum = maxSerial + 1;
  let candidate = generateUniqueId(prefixKey, wardNumDisplay, nextNum, serialLen);
  let exists = await Demand.findOne({ where: { demandNumber: candidate }, transaction });
  while (exists) {
    nextNum++;
    candidate = generateUniqueId(prefixKey, wardNumDisplay, nextNum, serialLen);
    exists = await Demand.findOne({ where: { demandNumber: candidate }, transaction });
  }
  return candidate;
}

/**
 * Payment and Receipt ID generation.
 * Uses max existing serial for the prefix (e.g. RCP023%) so generated IDs never collide with existing rows.
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

  // Build prefix: e.g. RCP023 or PAY000 (3-char type + 3-digit ward)
  const prefix = generateUniqueId(type, wardNumDisplay, 0, 6).slice(0, 6);

  if (moduleType === 'water') {
    const column = isReceipt ? 'receiptNumber' : 'paymentNumber';
    const rows = await WaterPayment.findAll({
      where: { [column]: { [Op.like]: `${prefix}%` } },
      attributes: [column],
      transaction
    });
    const serials = rows
      .map((r) => parseInt(String(r.get(column) || '').slice(6), 10))
      .filter((n) => !isNaN(n) && n >= 0);
    const nextSerial = (serials.length > 0 ? Math.max(...serials) : 0) + 1;
    return generateUniqueId(type, wardNumDisplay, nextSerial, 6);
  }

  // General: get max existing serial for this prefix from the actual column to avoid duplicates
  const column = isReceipt ? 'receiptNumber' : 'paymentNumber';
  const where = { [column]: { [Op.like]: `${prefix}%` } };
  const rows = await Payment.findAll({
    where,
    attributes: [column],
    transaction
  });
  const serials = rows
    .map((r) => parseInt(String(r.get(column) || '').slice(6), 10))
    .filter((n) => !isNaN(n) && n >= 0);
  const nextSerial = (serials.length > 0 ? Math.max(...serials) : 0) + 1;
  return generateUniqueId(type, wardNumDisplay, nextSerial, 6);
}

// Backward-compatible alias for property (used by controllers that pass wardId, propertyType only)
export async function generatePropertyId(wardId, propertyType, _transaction = null) {
  return await generatePropertyUniqueId(wardId, propertyType, 0);
}

/** Notice number: same format as codebase (PREFIX + WARD(3) + SERIAL(4)), unique per notice. */
const NOTICE_TYPE_PREFIX = {
  reminder: 'notice_reminder',
  demand: 'notice_demand',
  penalty: 'notice_penalty',
  final_warrant: 'notice_final_warrant'
};

export async function generateNoticeNumber(wardId, noticeType, transaction = null) {
  const ward = await Ward.findByPk(wardId, { transaction });
  const wardNumDisplay = ward ? ward.wardNumber : wardId;
  const prefixKey = NOTICE_TYPE_PREFIX[String(noticeType).toLowerCase()] || 'notice_reminder';

  const propertyIds = await Property.findAll({
    where: { wardId },
    attributes: ['id'],
    transaction
  }).then((r) => r.map((p) => p.id));
  const count = propertyIds.length
    ? await Notice.count({
      where: { propertyId: { [Op.in]: propertyIds } },
      transaction
    })
    : 0;

  let nextNum = count + 1;
  let candidate = generateUniqueId(prefixKey, wardNumDisplay, nextNum, 4);
  let exists = await Notice.findOne({ where: { noticeNumber: candidate }, transaction });
  while (exists) {
    nextNum++;
    candidate = generateUniqueId(prefixKey, wardNumDisplay, nextNum, 4);
    exists = await Notice.findOne({ where: { noticeNumber: candidate }, transaction });
  }
  return candidate;
}
