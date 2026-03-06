/**
 * Add missing actor role values to the enum used by audit_logs (e.g. supervisor).
 * Run from backend: node scripts/fix-audit-actor-role-enum.js
 */
import { sequelize } from '../config/database.js';

const VALUES_TO_ADD = ['supervisor', 'eo', 'field_worker', 'contractor'];

async function run() {
  try {
    await sequelize.authenticate();
    const enumName = process.env.AUDIT_ACTOR_ROLE_ENUM || 'user_role_enum';
    for (const val of VALUES_TO_ADD) {
      try {
        await sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE '${val}';`, { raw: true });
        console.log(`Added '${val}' to ${enumName}`);
      } catch (e) {
        if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
          console.log(`'${val}' already in ${enumName}`);
        } else {
          console.warn(`Could not add '${val}':`, e.message);
        }
      }
    }
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err.message);
    process.exit(1);
  }
}

run();
