/**
 * Add ulb_type column to ulbs table if missing.
 * Run once: node scripts/add-ulb-type-column.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../config/database.js';
import { DataTypes } from 'sequelize';

async function run() {
  const q = sequelize.getQueryInterface();
  const table = 'ulbs';
  const columns = await q.describeTable(table);
  if (columns.ulb_type) {
    console.log('ulb_type column already exists.');
    return;
  }
  await q.addColumn(table, 'ulb_type', {
    type: DataTypes.STRING(50),
    allowNull: true
  });
  console.log('Added ulb_type column to ulbs table.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sequelize.close());
