import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Migration script to add proofUrl and collectedBy columns to payments table
 * This is for field collection functionality
 */

const addPaymentProofColumns = async () => {
  try {
    console.log('Starting migration: Adding proofUrl and collectedBy columns to payments table...');

    // Check if columns already exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name IN ('proofUrl', 'collectedBy');
    `;

    const existingColumns = await sequelize.query(checkColumnsQuery, {
      type: QueryTypes.SELECT
    });

    const existingColumnNames = existingColumns.map(col => col.column_name);

    // Add proofUrl column if it doesn't exist
    if (!existingColumnNames.includes('proofUrl')) {
      await sequelize.query(`
        ALTER TABLE payments 
        ADD COLUMN "proofUrl" VARCHAR(500),
        ADD COLUMN CONSTRAINT payments_proofUrl_check 
        CHECK (char_length("proofUrl") <= 500);
      `);
      console.log('✅ Added proofUrl column to payments table');
    } else {
      console.log('ℹ️ proofUrl column already exists');
    }

    // Add collectedBy column if it doesn't exist
    if (!existingColumnNames.includes('collectedBy')) {
      await sequelize.query(`
        ALTER TABLE payments 
        ADD COLUMN "collectedBy" INTEGER,
        ADD CONSTRAINT payments_collectedBy_fkey 
        FOREIGN KEY ("collectedBy") REFERENCES "Users" ("id") ON DELETE SET NULL;
      `);
      console.log('✅ Added collectedBy column to payments table');
    } else {
      console.log('ℹ️ collectedBy column already exists');
    }

    // Add comments for documentation
    if (!existingColumnNames.includes('proofUrl')) {
      await sequelize.query(`
        COMMENT ON COLUMN payments."proofUrl" IS 'URL to payment proof document (for field collections)';
      `);
    }

    if (!existingColumnNames.includes('collectedBy')) {
      await sequelize.query(`
        COMMENT ON COLUMN payments."collectedBy" IS 'Collector who collected the payment in field';
      `);
    }

    console.log('✅ Migration completed successfully!');
    
    // Verify the columns were added
    const verifyQuery = `
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name IN ('proofUrl', 'collectedBy')
      ORDER BY column_name;
    `;

    const verifyResult = await sequelize.query(verifyQuery, {
      type: QueryTypes.SELECT
    });

    console.log('\n📋 Updated payments table structure:');
    verifyResult.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  addPaymentProofColumns()
    .then(() => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

export default addPaymentProofColumns;
