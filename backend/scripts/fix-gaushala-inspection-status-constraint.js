/**
 * Drop the gau_shala_inspections_status_check constraint so status can be 'pending', 'completed', etc.
 * Run from backend: node scripts/fix-gaushala-inspection-status-constraint.js
 */
import { sequelize } from '../config/database.js';

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.query(`
      ALTER TABLE gau_shala_inspections DROP CONSTRAINT IF EXISTS gau_shala_inspections_status_check;
    `);
    console.log('Dropped gau_shala_inspections_status_check constraint.');
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err.message);
    process.exit(1);
  }
}

run();
