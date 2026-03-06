/**
 * One-time script: extend toilet_inspections string columns so values like
 * "Satisfactory" (12 chars) and "Not Working" (11 chars) fit.
 * Run from backend folder: node scripts/alter-toilet-inspection-columns.js
 */
import { sequelize } from '../config/database.js';

const alterations = [
    ['status', 30],
    ['cleanliness', 20],
    ['maintenance', 20],
    ['waterSupply', 20],
    ['electricity', 20],
    ['ventilation', 20],
    ['lighting', 20]
];

async function run() {
    try {
        await sequelize.authenticate();
        for (const [col, len] of alterations) {
            await sequelize.query(
                `ALTER TABLE toilet_inspections ALTER COLUMN "${col}" TYPE VARCHAR(${len});`
            );
            console.log(`Altered toilet_inspections.${col} to VARCHAR(${len}).`);
        }
        console.log('Done. Toilet inspection columns updated.');
        process.exit(0);
    } catch (err) {
        console.error('Script failed:', err.message);
        process.exit(1);
    }
}

run();
