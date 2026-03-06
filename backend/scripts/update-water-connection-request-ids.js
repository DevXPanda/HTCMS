/**
 * One-time update: set water connection request requestNumber to new format (WCR + ward(3) + serial(4))
 * for records that still have old format (e.g. WCR-000016, WCR-2026-000001).
 *
 * Usage (from backend directory):
 *   node scripts/update-water-connection-request-ids.js
 * Or: npm run update-wcr-ids   (if script is added to package.json)
 */

import { sequelize } from '../config/database.js';
import { WaterConnectionRequest, Property, Ward } from '../models/index.js';
import { generateUniqueId } from '../utils/generateUniqueId.js';

const NEW_FORMAT_REGEX = /^WCR\d{7}$/; // WCR + 3 digit ward + 4 digit serial

function isOldFormat(requestNumber) {
  if (!requestNumber || typeof requestNumber !== 'string') return true;
  return !NEW_FORMAT_REGEX.test(requestNumber.trim());
}

async function getWardNumDisplay(wardId, wardCache) {
  if (wardCache.has(wardId)) return wardCache.get(wardId);
  const ward = await Ward.findByPk(wardId, { attributes: ['id', 'wardNumber'] });
  const display = ward ? ward.wardNumber : wardId;
  wardCache.set(wardId, display);
  return display;
}

async function updateWaterConnectionRequestIds() {
  const requests = await WaterConnectionRequest.findAll({
    include: [{ model: Property, as: 'property', attributes: ['id', 'wardId'] }],
    order: [['id', 'ASC']]
  });

  const oldFormatRequests = requests.filter((r) => isOldFormat(r.requestNumber));
  if (oldFormatRequests.length === 0) {
    console.log('No water connection requests with old-format IDs found. Nothing to update.');
    return { updated: 0, skipped: 0 };
  }

  const wardCache = new Map();
  const byWard = {};
  for (const r of oldFormatRequests) {
    const wardId = r.property?.wardId;
    if (wardId == null) {
      console.warn(`Request id=${r.id} has no property or property.wardId; skipping.`);
      continue;
    }
    if (!byWard[wardId]) byWard[wardId] = [];
    byWard[wardId].push(r);
  }

  for (const wardId of Object.keys(byWard)) {
    byWard[wardId].sort((a, b) => a.id - b.id);
  }

  const usedRequestNumbers = new Set(requests.map((r) => r.requestNumber).filter(Boolean));
  const toUpdate = [];

  for (const wardId of Object.keys(byWard).map(Number)) {
    const wardNumDisplay = await getWardNumDisplay(wardId, wardCache);
    const list = byWard[wardId];

    const propertyIds = await Property.findAll({
      where: { wardId },
      attributes: ['id']
    }).then((rows) => rows.map((r) => r.id));

    const existingInWard = requests.filter(
      (r) => r.requestNumber && NEW_FORMAT_REGEX.test(r.requestNumber) && r.property && propertyIds.includes(r.property.id)
    );
    let maxSerial = 0;
    for (const r of existingInWard) {
      const match = r.requestNumber.match(/^WCR\d{3}(\d{4})$/);
      if (match) {
        const serial = parseInt(match[1], 10);
        if (!isNaN(serial)) maxSerial = Math.max(maxSerial, serial);
      }
    }

    for (const req of list) {
      maxSerial++;
      let candidate = generateUniqueId('water_connection_request', wardNumDisplay, maxSerial);
      while (usedRequestNumbers.has(candidate)) {
        maxSerial++;
        candidate = generateUniqueId('water_connection_request', wardNumDisplay, maxSerial);
      }
      usedRequestNumbers.add(candidate);
      toUpdate.push({ id: req.id, requestNumber: candidate, oldNumber: req.requestNumber });
    }
  }

  for (const { id, requestNumber, oldNumber } of toUpdate) {
    await WaterConnectionRequest.update({ requestNumber }, { where: { id } });
    console.log(`  Updated id=${id}: "${oldNumber}" -> "${requestNumber}"`);
  }

  console.log(`Water connection requests updated: ${toUpdate.length} (old format -> WCR+ward+serial).`);
  return { updated: toUpdate.length, skipped: oldFormatRequests.length - toUpdate.length };
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB. Updating old water connection request IDs...');
    await updateWaterConnectionRequestIds();
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
