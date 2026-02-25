import { sequelize } from './config/database.js';

async function migrate() {
    try {
        console.log('Adding detailed proof columns to toilet_complaints...');
        await sequelize.query(`
            ALTER TABLE toilet_complaints 
            ADD COLUMN IF NOT EXISTS "resolution_before_photo" VARCHAR(500),
            ADD COLUMN IF NOT EXISTS "resolution_before_lat" DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS "resolution_before_lng" DECIMAL(11, 8),
            ADD COLUMN IF NOT EXISTS "resolution_before_address" TEXT,
            ADD COLUMN IF NOT EXISTS "resolution_after_photo" VARCHAR(500),
            ADD COLUMN IF NOT EXISTS "resolution_after_lat" DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS "resolution_after_lng" DECIMAL(11, 8),
            ADD COLUMN IF NOT EXISTS "resolution_after_address" TEXT,
            ADD COLUMN IF NOT EXISTS "is_escalated" BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS "escalation_reason" TEXT;
        `);
        console.log('✅ Columns added successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}

migrate();
