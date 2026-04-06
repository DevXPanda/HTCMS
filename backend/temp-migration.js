import { sequelize } from './config/database.js';

const runMigration = async () => {
    try {
        console.log('Starting migration to add missing columns to ulbs table...');
        
        const query = `
            ALTER TABLE "ulbs" 
            ADD COLUMN IF NOT EXISTS "address_line_1" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "address_line_2" VARCHAR(255),
            ADD COLUMN IF NOT EXISTS "pincode" VARCHAR(20),
            ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20),
            ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
        `;
        
        await sequelize.query(query);
        console.log('✅ Migration successful: Columns added to ulbs table.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
