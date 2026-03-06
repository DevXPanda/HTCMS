/**
 * Fix ward collector foreign key: point wards.collector_id (or collectorId) to admin_management.id.
 * Use this if you get: insert or update on table "wards" violates foreign key constraint "fk_ward_collector"
 *
 * Run from project root (with .env or backend/.env containing DATABASE_URL):
 *   node backend/scripts/fix-ward-collector-fk.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sequelize } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  try {
    // Get the actual column name for collector on wards table
    const [colResults] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wards'
      AND (column_name = 'collectorId' OR column_name = 'collector_id')
      LIMIT 1
    `);
    const columnName = colResults[0]?.column_name;
    if (!columnName) {
      console.error('Could not find collector column (collectorId or collector_id) on wards table.');
      process.exit(1);
    }
    const quotedColumn = columnName === 'collector_id' ? 'collector_id' : '"collectorId"';

    console.log('Dropping existing fk_ward_collector constraint if present...');
    await sequelize.query('ALTER TABLE wards DROP CONSTRAINT IF EXISTS fk_ward_collector');

    console.log('Adding fk_ward_collector: wards.' + columnName + ' -> admin_management(id)');
    await sequelize.query(`
      ALTER TABLE wards
      ADD CONSTRAINT fk_ward_collector
      FOREIGN KEY (${quotedColumn})
      REFERENCES admin_management(id)
    `);
    console.log('Done. Ward collector FK now references admin_management(id).');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Constraint fk_ward_collector already exists. Drop it first if you need to recreate.');
      return;
    }
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
