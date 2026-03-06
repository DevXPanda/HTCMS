/**
 * Add licenseDocumentUrl column to shops table if missing.
 * Run from backend folder: node scripts/add-shop-license-document-column.js
 */
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function run() {
  try {
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();

    if (dialect === 'postgres') {
      const rows = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'licenseDocumentUrl'`,
        { type: QueryTypes.SELECT }
      );
      const hasColumn = Array.isArray(rows) && rows.length > 0;
      if (!hasColumn) {
        await sequelize.query(`ALTER TABLE shops ADD COLUMN "licenseDocumentUrl" VARCHAR(500);`);
        console.log('Added column shops.licenseDocumentUrl');
      } else {
        console.log('Column shops.licenseDocumentUrl already exists');
      }
    } else {
      await sequelize.getQueryInterface().addColumn('shops', 'licenseDocumentUrl', {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true
      }).catch((err) => {
        if (err.message && err.message.includes('already exists')) {
          console.log('Column shops.licenseDocumentUrl already exists');
          return;
        }
        throw err;
      });
      console.log('Added column shops.licenseDocumentUrl');
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

run();
