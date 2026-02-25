import { sequelize } from './config/database.js';

async function migrate() {
    try {
        console.log('Adding workerId and resolutionPhotos to toilet_complaints...');
        await sequelize.query(`
            ALTER TABLE toilet_complaints 
            ADD COLUMN IF NOT EXISTS "workerId" UUID NULL REFERENCES workers(id),
            ADD COLUMN IF NOT EXISTS "resolutionPhotos" JSONB DEFAULT '[]';
        `);
        console.log('✅ Columns added successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}

migrate();
