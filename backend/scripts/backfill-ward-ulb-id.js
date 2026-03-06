/**
 * One-time backfill: set ulb_id on wards that have NULL.
 * Uses the single existing ULB so existing data continues to work.
 * After running, ulb_id can be set to NOT NULL (run migration or alter manually if desired).
 *
 * Usage: node backend/scripts/backfill-ward-ulb-id.js
 * Or from repo root: node --experimental-vm-modules backend/scripts/backfill-ward-ulb-id.js
 */

import { sequelize } from '../config/database.js';
import { Ward, ULB } from '../models/index.js';

async function main() {
  try {
    const ulb = await ULB.findOne({ where: { status: 'ACTIVE' }, order: [['created_at', 'ASC']] });
    if (!ulb) {
      console.error('No ULB found. Create at least one ULB in ulbs table.');
      process.exit(1);
    }

    const [updated] = await Ward.update(
      { ulb_id: ulb.id },
      { where: { ulb_id: null } }
    );

    console.log(`Backfill complete: ${updated} ward(s) set to ULB "${ulb.name}" (${ulb.id}).`);

    try {
      await sequelize.query('ALTER TABLE wards ALTER COLUMN ulb_id SET NOT NULL;');
      console.log('Column wards.ulb_id set to NOT NULL.');
    } catch (alterErr) {
      if (alterErr.message && alterErr.message.includes('already')) {
        console.log('Column ulb_id is already NOT NULL.');
      } else {
        console.warn('Could not set NOT NULL (run manually if needed):', alterErr.message);
      }
    }
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
