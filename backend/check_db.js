import { sequelize } from './config/database.js';

async function verify() {
    try {
        const [rows] = await sequelize.query(`
            SELECT table_name, column_name, data_type
            FROM information_schema.columns 
            WHERE table_name IN ('toilet_maintenance', 'toilet_inspections', 'toilet_complaints', 'toilet_facilities')
              AND column_name IN ('photos', 'amenities', 'materialsUsed')
            ORDER BY table_name, column_name;
        `);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

verify();
