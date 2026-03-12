/**
 * Run SFI role migration: add SFI to admin_management.role and sfi to audit_logs.actor_role enums.
 * Usage: node scripts/run-sfi-migration.js
 * Requires: DATABASE_URL in .env
 */
import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in backend/.env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.startsWith('postgres')
      ? { rejectUnauthorized: false }
      : false
  });

  const sqlPath = path.join(__dirname, '..', 'migrations', 'add-sfi-role-to-admin-management.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('SFI migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
