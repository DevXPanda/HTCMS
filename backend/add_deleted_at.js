import { sequelize } from './config/database.js';

async function addDeletedAt() {
    try {
        console.log('Adding deletedAt to toilet_complaints...');
        await sequelize.query(`
            ALTER TABLE toilet_complaints 
            ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE NULL;
        `);
        console.log('✅ deletedAt column added successfully.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}

addDeletedAt();
