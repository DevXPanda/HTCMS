/**
 * One-time backfill: set ulb_id on users (citizens/admins) that have NULL
 * so they appear in the Citizen Management list when filtering by ULB.
 *
 * Usage: node backend/scripts/backfill-citizen-ulb-id.js
 * From repo root: node backend/scripts/backfill-citizen-ulb-id.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User, ULB } from '../models/index.js';

async function main() {
  try {
    const ulb = await ULB.findOne({ where: { status: 'ACTIVE' }, order: [['created_at', 'ASC']] });
    if (!ulb) {
      console.error('No ULB found. Create at least one ULB in ulbs table.');
      process.exit(1);
    }

    const [updated] = await User.update(
      { ulb_id: ulb.id },
      { where: { ulb_id: null, role: { [Op.in]: ['citizen', 'admin'] } } }
    );

    console.log(`Backfill complete: ${updated} user(s) (citizen/admin) set to ULB "${ulb.name}" (${ulb.id}).`);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
