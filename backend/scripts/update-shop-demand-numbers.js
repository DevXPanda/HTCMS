/**
 * One-time script: update shop tax demands with old format (STD-2025-26-timestamp-id)
 * to unique code format (STD0230001). Run from backend: node scripts/update-shop-demand-numbers.js
 */
import { Demand, Property, Ward } from '../models/index.js';
import { Op } from 'sequelize';
import { generateUniqueId } from '../utils/generateUniqueId.js';

// Old format: STD-2025-26-1772449608930-12 (has hyphen after STD). New format: STD0230001 (STD + 7 digits).
const OLD_LIKE = 'STD-%';
const NEW_FORMAT_LIKE = 'STD_______'; // STD + exactly 7 chars (digits)

async function getNextSerialForWard(wardNumber, transaction) {
  const wardCode = String(Number(wardNumber) || 0).padStart(3, '0');
  const prefix = `STD${wardCode}`;
  const demands = await Demand.findAll({
    where: {
      demandNumber: { [Op.like]: `${prefix}%` }
    },
    attributes: ['demandNumber'],
    raw: true,
    transaction
  });
  let maxSerial = 0;
  for (const d of demands) {
    const num = d.demandNumber.slice(prefix.length);
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
    const oldShopDemands = await Demand.findAll({
      where: {
        serviceType: 'SHOP_TAX',
        [Op.and]: [
          { demandNumber: { [Op.like]: OLD_LIKE } },
          { demandNumber: { [Op.notLike]: NEW_FORMAT_LIKE } }
        ]
      },
      include: [{ model: Property, as: 'property', include: [{ model: Ward, as: 'ward' }] }],
      order: [['id', 'ASC']],
      transaction
    });

    if (oldShopDemands.length === 0) {
      console.log('No shop demands with old format (STD-...) found. Nothing to update.');
      await transaction.commit();
      process.exit(0);
      return;
    }

    console.log(`Found ${oldShopDemands.length} shop demand(s) with old format. Updating...`);

    for (const demand of oldShopDemands) {
      const property = demand.property;
      const ward = property?.ward;
      const wardId = property?.wardId;
      const wardNumber = ward ? ward.wardNumber : wardId;
      if (wardId == null) {
        console.warn(`Demand id=${demand.id} has no property/ward, skipping.`);
        continue;
      }
      const nextSerial = await getNextSerialForWard(wardNumber, transaction);
      const newDemandNumber = generateUniqueId('shop_demand', wardNumber, nextSerial, 4);
      await demand.update({ demandNumber: newDemandNumber }, { transaction });
      console.log(`  id=${demand.id}: ${demand.demandNumber} -> ${newDemandNumber}`);
    }

    await transaction.commit();
    console.log('Done. Shop demands now use unique codes.');
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
