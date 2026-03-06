/**
 * One-time: add ulb_id to wards (if missing), drop global unique on ward_number,
 * add composite unique (ulb_id, ward_number). Run backfill-ward-ulb-id.js first if wards have NULL ulb_id.
 *
 * Usage: node backend/scripts/wards-ulb-composite-unique.js
 */
import { sequelize } from '../config/database.js';

async function run() {
  try {
    await sequelize.authenticate();

    await sequelize.query(`
      ALTER TABLE wards ADD COLUMN IF NOT EXISTS ulb_id UUID REFERENCES ulbs(id);
    `);
    console.log('Ensured wards.ulb_id column exists.');

    await sequelize.query(`
      DROP INDEX IF EXISTS wards_ward_number_key;
    `);
    await sequelize.query(`
      ALTER TABLE wards DROP CONSTRAINT IF EXISTS wards_ward_number_key;
    `);
    console.log('Dropped global unique on ward_number if present.');

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS wards_ulb_id_ward_number_unique ON wards(ulb_id, ward_number);
    `);
    console.log('Created composite unique index (ulb_id, ward_number).');

    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
