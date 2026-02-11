/**
 * Shop Tax Module Migration
 * Creates shops, shop_tax_assessments tables and adds SHOP_TAX support to demands.
 * Run with: node migrations/20250211000001-shop-module.js (from backend directory)
 * Or: node --experimental-vm-modules migrations/20250211000001-shop-module.js
 */
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

async function run() {
  const queryInterface = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  if (dialect !== 'postgres') {
    console.log('This migration is for PostgreSQL. Skipping.');
    process.exit(0);
  }

  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // 1) Create shops table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        "shopNumber" VARCHAR(50) NOT NULL UNIQUE,
        "propertyId" INTEGER NOT NULL REFERENCES properties(id),
        "wardId" INTEGER NOT NULL REFERENCES wards(id),
        "ownerId" INTEGER REFERENCES users(id),
        "shopName" VARCHAR(200) NOT NULL,
        "shopType" VARCHAR(20) NOT NULL DEFAULT 'retail' CHECK ("shopType" IN ('retail', 'wholesale', 'food_stall', 'service', 'other')),
        category VARCHAR(50),
        area DECIMAL(10, 2),
        address TEXT,
        "contactName" VARCHAR(100),
        "contactPhone" VARCHAR(20),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
        "isActive" BOOLEAN DEFAULT true,
        remarks TEXT,
        "createdBy" INTEGER REFERENCES users(id),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Table shops created or already exists.');

    await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS shops_shop_number_unique ON shops("shopNumber");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS shops_property_id ON shops("propertyId");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS shops_ward_id ON shops("wardId");');
    await sequelize.query('CREATE INDEX IF NOT EXISTS shops_status ON shops(status);');

    // 2) Create shop_tax_assessments table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS shop_tax_assessments (
        id SERIAL PRIMARY KEY,
        "assessmentNumber" VARCHAR(50) NOT NULL UNIQUE,
        "shopId" INTEGER NOT NULL REFERENCES shops(id),
        "assessmentYear" INTEGER NOT NULL,
        "financialYear" VARCHAR(10),
        "assessedValue" DECIMAL(12, 2),
        rate DECIMAL(10, 2),
        "annualTaxAmount" DECIMAL(12, 2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
        "assessorId" INTEGER REFERENCES users(id),
        "approvedBy" INTEGER REFERENCES users(id),
        "approvalDate" TIMESTAMP WITH TIME ZONE,
        remarks TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Table shop_tax_assessments created or already exists.');

    await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS shop_tax_assessments_number_unique ON shop_tax_assessments("assessmentNumber");');
    await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS shop_tax_assessments_shop_year_unique ON shop_tax_assessments("shopId", "assessmentYear");');

    // 3) Add shopTaxAssessmentId to demands if not exists
    const hasColumn = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'demands' AND column_name = 'shopTaxAssessmentId';`,
      { type: QueryTypes.SELECT }
    );
    if (!hasColumn || hasColumn.length === 0) {
      await sequelize.query(`
        ALTER TABLE demands ADD COLUMN "shopTaxAssessmentId" INTEGER REFERENCES shop_tax_assessments(id);
      `);
      console.log('Column demands.shopTaxAssessmentId added.');
    } else {
      console.log('Column demands.shopTaxAssessmentId already exists.');
    }

    // 4) Add SHOP_TAX to serviceType (Postgres) - only if column uses enum type; if VARCHAR, no change needed
    const colInfo = await sequelize.query(
      `SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = 'demands' AND column_name = 'serviceType';`,
      { type: QueryTypes.SELECT }
    );
    const row = colInfo && colInfo[0];
    const typeName = row && row.udt_name;
    const isEnum = typeName && row.data_type === 'USER-DEFINED' && !['varchar', 'character varying'].includes(typeName);
    if (isEnum) {
      try {
        await sequelize.query(`ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'SHOP_TAX';`);
        console.log(`Enum ${typeName} updated with SHOP_TAX.`);
      } catch (e) {
        if (e.message && e.message.includes('already exists')) {
          console.log('SHOP_TAX already in enum.');
        } else {
          throw e;
        }
      }
    } else {
      console.log('demands.serviceType is not an enum (e.g. VARCHAR); SHOP_TAX is allowed by application.');
    }

    console.log('Shop module migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
