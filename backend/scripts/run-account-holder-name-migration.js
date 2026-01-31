import fs from 'fs';
import path from 'path';
import { sequelize } from '../config/database.js';

const runAccountHolderNameMigration = async () => {
  try {
    console.log('Running account holder name column migration...');
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'scripts', 'add-account-holder-name-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await sequelize.query(sql);
    
    console.log('✅ Account holder name migration completed successfully!');
    
    // Verify the migration
    const verifyQuery = `
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name = 'accountHolderName'
      ORDER BY column_name;
    `;
    
    const result = await sequelize.query(verifyQuery);
    
    console.log('\n📋 Updated payments table structure:');
    result[0].forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

runAccountHolderNameMigration();
