/**
 * One-time migration: normalize existing ward numbers to 3-digit format (e.g. 1 -> 001).
 * Run from backend folder: node run-migrate-ward-number-001.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

function normalizeWardNumber(val) {
  if (val == null || val === '') return val;
  const s = String(val).trim();
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 0) return String(n).padStart(3, '0');
  return s;
}

async function run() {
  const { Ward } = await import('./models/index.js');
  const { sequelize } = await import('./config/database.js');
  try {
    await sequelize.authenticate();

    // DB may have a single-column unique on wardNumber; app expects unique per (ulb_id, wardNumber).
    const [constraints] = await sequelize.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'wards'::regclass AND contype = 'u'
    `);
    const names = (constraints || []).map(c => c.conname);
    if (names.includes('wards_wardNumber_key')) {
      await sequelize.query('ALTER TABLE wards DROP CONSTRAINT IF EXISTS "wards_wardNumber_key";');
      console.log('Dropped single-column unique constraint wards_wardNumber_key.');
    }
    if (!names.includes('wards_ulb_id_ward_number_unique')) {
      await sequelize.query(`
        ALTER TABLE wards
        ADD CONSTRAINT wards_ulb_id_ward_number_unique
        UNIQUE ("ulb_id", "wardNumber");
      `).catch(() => {});
    }

    const wards = await Ward.findAll({ attributes: ['id', 'wardNumber', 'ulb_id'], raw: true });
    const byUlbAndNormalized = new Map();
    for (const w of wards) {
      const normalized = normalizeWardNumber(w.wardNumber);
      if (!normalized || normalized === w.wardNumber) continue;
      const key = `${w.ulb_id || 'null'}|${normalized}`;
      if (!byUlbAndNormalized.has(key)) byUlbAndNormalized.set(key, []);
      byUlbAndNormalized.get(key).push(w);
    }
    const duplicates = [...byUlbAndNormalized.entries()].filter(([, list]) => list.length > 1);
    if (duplicates.length > 0) {
      console.error('Migration skipped: duplicate ward numbers would result in the same normalized value (e.g. "1" and "01" in same ULB). Resolve manually:');
      duplicates.forEach(([key, list]) => {
        const [ulbId, norm] = key.split('|');
        console.error(`  ULB ${ulbId} -> "${norm}": ward ids ${list.map(w => w.id).join(', ')} (current numbers: ${list.map(w => w.wardNumber).join(', ')})`);
      });
      process.exit(1);
    }

    let updated = 0;
    for (const ward of wards) {
      const normalized = normalizeWardNumber(ward.wardNumber);
      if (normalized && normalized !== ward.wardNumber) {
        await Ward.update(
          { wardNumber: normalized },
          { where: { id: ward.id }, validate: false }
        );
        updated++;
      }
    }
    console.log(`Migration OK: normalized ${updated} ward number(s) to 001 format. Total wards: ${wards.length}.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.errors) console.error('Details:', JSON.stringify(err.errors, null, 2));
    if (err.parent) console.error('DB error:', err.parent.message);
    process.exit(1);
  }
}

run();
