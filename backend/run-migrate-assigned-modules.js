/**
 * One-time migration: add assigned_modules column to admin_management.
 * Run from backend folder: npm run migrate:assigned-modules
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
    await sequelize.query(`
      ALTER TABLE admin_management
      ADD COLUMN IF NOT EXISTS assigned_modules TEXT[] DEFAULT '{}';
    `);
    console.log('Migration OK: assigned_modules column added (or already exists).');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
