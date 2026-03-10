/**
 * One-time migration: add before_photo_url and after_photo_url to worker_attendance.
 * Run from backend folder: npm run migrate:attendance-photos
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
    await sequelize.query(`ALTER TABLE worker_attendance ADD COLUMN IF NOT EXISTS before_photo_url VARCHAR(500);`);
    await sequelize.query(`ALTER TABLE worker_attendance ADD COLUMN IF NOT EXISTS after_photo_url VARCHAR(500);`);
    console.log('Migration OK: before_photo_url and after_photo_url added to worker_attendance.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
