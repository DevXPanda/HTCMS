import { sequelize } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to fix the users table role constraint
 * Adds 'collector' to the allowed role values
 */
async function fixRoleConstraint() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Check if using PostgreSQL ENUM or CHECK constraint
    const [results] = await sequelize.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
      AND conname = 'users_role_check';
    `);

    if (results.length > 0) {
      console.log('Found CHECK constraint, updating...');
      
      // Drop the old constraint
      await sequelize.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      `);
      
      // Add new constraint with 'collector'
      await sequelize.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'assessor', 'cashier', 'collector', 'tax_collector', 'citizen'));
      `);
      
      console.log('✅ Successfully updated role constraint to include "collector"');
    } else {
      // Check if using ENUM type
      const [enumResults] = await sequelize.query(`
        SELECT 
          t.typname as enum_name,
          e.enumlabel as enum_value
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname LIKE '%role%'
        ORDER BY e.enumsortorder;
      `);

      if (enumResults.length > 0) {
        console.log('Found ENUM type, checking if collector exists...');
        const hasCollector = enumResults.some(r => r.enum_value === 'collector');
        
        if (!hasCollector) {
          // Get the enum type name
          const enumName = enumResults[0].enum_name;
          console.log(`Adding 'collector' to ENUM type: ${enumName}`);
          
          await sequelize.query(`
            ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS 'collector';
          `);
          
          console.log('✅ Successfully added "collector" to ENUM type');
        } else {
          console.log('✅ "collector" already exists in ENUM type');
        }
      } else {
        console.log('⚠️  No CHECK constraint or ENUM found. The table might use a different constraint type.');
        console.log('Attempting to add CHECK constraint...');
        
        // Try to add CHECK constraint
        await sequelize.query(`
          ALTER TABLE users 
          DROP CONSTRAINT IF EXISTS users_role_check;
        `);
        
        await sequelize.query(`
          ALTER TABLE users 
          ADD CONSTRAINT users_role_check 
          CHECK (role IN ('admin', 'assessor', 'cashier', 'collector', 'tax_collector', 'citizen'));
        `);
        
        console.log('✅ Added CHECK constraint with "collector"');
      }
    }

    console.log('\n✅ Role constraint fix completed successfully!');
    console.log('You can now register users with role="collector"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing role constraint:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
fixRoleConstraint();
