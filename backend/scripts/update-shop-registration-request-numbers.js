/**
 * One-time script: update shop registration requests with old format (SRR-2026-00006)
 * to unique code format (SRR0010001). Run from backend: node scripts/update-shop-registration-request-numbers.js
 */
import { ShopRegistrationRequest, Property, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { generateUniqueId } from '../utils/generateUniqueId.js';

// Old format: SRR-2026-00006 (has hyphen after SRR). New format: SRR0010001 (SRR + 7 digits).
const OLD_LIKE = 'SRR-%';
const NEW_FORMAT_LIKE = 'SRR_______'; // SRR + exactly 7 chars (digits)

async function getNextSerialForWard(wardNumber, transaction) {
  const wardCode = String(Number(wardNumber) || 0).padStart(3, '0');
  const prefix = `SRR${wardCode}`;
  const requests = await ShopRegistrationRequest.findAll({
    where: {
      requestNumber: { [Op.like]: `${prefix}%` }
    },
    attributes: ['requestNumber'],
    raw: true,
    transaction
  });
  let maxSerial = 0;
  for (const r of requests) {
    const num = r.requestNumber.slice(prefix.length);
    if (/^\d{4}$/.test(num)) {
      const s = parseInt(num, 10);
      if (s > maxSerial) maxSerial = s;
    }
  }
  return maxSerial + 1;
}

async function run() {
  const { sequelize } = await import('../config/database.js');
  const transaction = await sequelize.transaction();
  try {
    const oldRequests = await ShopRegistrationRequest.findAll({
      where: {
        [Op.and]: [
          { requestNumber: { [Op.like]: OLD_LIKE } },
          { requestNumber: { [Op.notLike]: NEW_FORMAT_LIKE } }
        ]
      },
      include: [{ model: Property, as: 'property', include: [{ model: Ward, as: 'ward' }] }],
      order: [['id', 'ASC']],
      transaction
    });

    if (oldRequests.length === 0) {
      console.log('No shop registration requests with old format (SRR-...) found. Nothing to update.');
      await transaction.commit();
      process.exit(0);
      return;
    }

    console.log(`Found ${oldRequests.length} shop registration request(s) with old format. Updating...`);

    for (const req of oldRequests) {
      const property = req.property;
      const ward = property?.ward;
      const wardId = property?.wardId;
      const wardNumber = ward ? ward.wardNumber : wardId;
      if (wardId == null) {
        console.warn(`ShopRegistrationRequest id=${req.id} has no property/ward, skipping.`);
        continue;
      }
      const nextSerial = await getNextSerialForWard(wardNumber, transaction);
      const newRequestNumber = generateUniqueId('shop_registration_request', wardNumber, nextSerial, 4);
      const oldNumber = req.requestNumber;
      await req.update({ requestNumber: newRequestNumber }, { transaction });
      console.log(`  id=${req.id}: ${oldNumber} -> ${newRequestNumber}`);
    }

    await transaction.commit();
    console.log('Done. Shop registration requests now use unique codes.');
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
