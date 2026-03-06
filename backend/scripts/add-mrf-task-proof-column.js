/**
 * One-time: add proof column to mrf_tasks for before/after photo + location.
 * Run from backend: node scripts/add-mrf-task-proof-column.js
 */
import { sequelize } from '../config/database.js';

async function run() {
    try {
        await sequelize.authenticate();
        await sequelize.query(`
            ALTER TABLE mrf_tasks ADD COLUMN IF NOT EXISTS proof JSONB;
        `);
        console.log('Added mrf_tasks.proof column.');
        process.exit(0);
    } catch (err) {
        console.error('Script failed:', err.message);
        process.exit(1);
    }
}

run();
