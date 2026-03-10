/**
 * One-time migration: update workers.worker_type check constraint to allow all worker types.
 * Run from backend folder: npm run migrate:worker-type
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

async function run() {
  const { sequelize } = await import('./config/database.js');
  try {
    await sequelize.authenticate();
    await sequelize.query(`ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_worker_type_check;`);
    await sequelize.query(`
      ALTER TABLE workers ADD CONSTRAINT workers_worker_type_check CHECK (
        worker_type IN (
          'ULB', 'CONTRACTUAL', 'SWEEPING', 'TOILET', 'MRF',
          'CLEANING', 'DRAINAGE', 'SOLID_WASTE', 'ROAD_MAINTENANCE', 'OTHER'
        )
      );
    `);
    console.log('Migration OK: workers_worker_type_check updated to allow all worker types.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
