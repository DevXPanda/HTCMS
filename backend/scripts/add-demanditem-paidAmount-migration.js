/**
 * Migration: Add paidAmount field to tax_demand_items table
 * 
 * This migration adds item-level payment tracking capability
 * to fix the critical financial design gap identified in QA v2.
 */

import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Add paidAmount column to tax_demand_items table
 */
export const addPaidAmountToDemandItems = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Adding paidAmount field to tax_demand_items table...');
    
    // Check if column already exists
    const columnCheck = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tax_demand_items' 
      AND column_name = 'paidAmount'
    `, {
      type: QueryTypes.SELECT,
      transaction
    });
    
    if (columnCheck.length > 0) {
      console.log('✅ paidAmount column already exists');
      await transaction.rollback();
      return { success: true, message: 'Column already exists' };
    }
    
    // Add the paidAmount column
    await sequelize.query(`
      ALTER TABLE tax_demand_items 
      ADD COLUMN paidAmount DECIMAL(12, 2) DEFAULT 0 NOT NULL
    `, {
      type: QueryTypes.RAW,
      transaction
    });
    
    console.log('✅ paidAmount column added successfully');
    
    // Add comment to the column
    try {
      await sequelize.query(`
        COMMENT ON COLUMN tax_demand_items.paidAmount IS 'Amount paid for this item (item-level payment tracking)'
      `, {
        type: QueryTypes.RAW,
        transaction
      });
      console.log('✅ Column comment added');
    } catch (commentError) {
      console.log('⚠️  Could not add column comment (non-critical):', commentError.message);
    }
    
    // Add check constraints (PostgreSQL specific)
    try {
      await sequelize.query(`
        ALTER TABLE tax_demand_items 
        ADD CONSTRAINT chk_paidamount_nonnegative 
        CHECK (paidAmount >= 0)
      `, {
        type: QueryTypes.RAW,
        transaction
      });
      console.log('✅ Non-negative constraint added');
    } catch (constraintError) {
      console.log('⚠️  Could not add non-negative constraint:', constraintError.message);
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE tax_demand_items 
        ADD CONSTRAINT chk_paidamount_not_exceed_total 
        CHECK (paidAmount <= totalAmount)
      `, {
        type: QueryTypes.RAW,
        transaction
      });
      console.log('✅ Total amount constraint added');
    } catch (constraintError) {
      console.log('⚠️  Could not add total amount constraint:', constraintError.message);
    }
    
    await transaction.commit();
    
    console.log('✅ Successfully added paidAmount field to tax_demand_items table');
    console.log('✅ Added constraints: paidAmount >= 0 and paidAmount <= totalAmount');
    
    return { 
      success: true, 
      message: 'paidAmount field added successfully with constraints' 
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

/**
 * Rollback: Remove paidAmount column from tax_demand_items table
 */
export const removePaidAmountFromDemandItems = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Rolling back: Removing paidAmount field from tax_demand_items table...');
    
    // Drop constraints first
    await sequelize.query(`
      ALTER TABLE tax_demand_items 
      DROP CONSTRAINT IF EXISTS chk_paidamount_nonnegative
    `, {
      type: QueryTypes.RAW,
      transaction
    });
    
    await sequelize.query(`
      ALTER TABLE tax_demand_items 
      DROP CONSTRAINT IF EXISTS chk_paidamount_not_exceed_total
    `, {
      type: QueryTypes.RAW,
      transaction
    });
    
    // Drop the column
    await sequelize.query(`
      ALTER TABLE tax_demand_items 
      DROP COLUMN IF EXISTS paidAmount
    `, {
      type: QueryTypes.RAW,
      transaction
    });
    
    await transaction.commit();
    
    console.log('✅ Successfully rolled back: paidAmount field removed');
    
    return { 
      success: true, 
      message: 'paidAmount field removed successfully' 
    };
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
};

/**
 * Verify migration success
 */
export const verifyPaidAmountMigration = async () => {
  try {
    console.log('🔍 Verifying paidAmount field migration...');
    
    const result = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'tax_demand_items' 
      AND column_name = 'paidAmount'
    `, {
      type: QueryTypes.SELECT
    });
    
    if (result.length === 0) {
      throw new Error('paidAmount column not found after migration');
    }
    
    const column = result[0];
    console.log('✅ paidAmount column verified:');
    console.log(`   - Type: ${column.data_type}`);
    console.log(`   - Nullable: ${column.is_nullable}`);
    console.log(`   - Default: ${column.column_default}`);
    
    // Check constraints
    const constraints = await sequelize.query(`
      SELECT conname, consrc 
      FROM pg_constraint 
      WHERE conrelid = 'tax_demand_items'::regclass 
      AND conname LIKE '%paidamount%'
    `, {
      type: QueryTypes.SELECT
    });
    
    console.log(`✅ Found ${constraints.length} constraints for paidAmount`);
    constraints.forEach(constraint => {
      console.log(`   - ${constraint.conname}: ${constraint.consrc}`);
    });
    
    return { 
      success: true, 
      message: 'Migration verified successfully',
      column,
      constraints 
    };
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
};

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const action = process.argv[2] || 'up';
  
  if (action === 'up') {
    await addPaidAmountToDemandItems();
    await verifyPaidAmountMigration();
  } else if (action === 'down') {
    await removePaidAmountFromDemandItems();
  } else {
    console.log('Usage: node add-demanditem-paidAmount-migration.js [up|down]');
  }
}
