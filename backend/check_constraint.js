import { sequelize } from './config/database.js';

async function checkConstraint() {
    try {
        const [results] = await sequelize.query(`
            SELECT conname, pg_get_constraintdef(c.oid) AS constraint_def
            FROM pg_constraint c
            JOIN pg_class cl ON cl.oid = c.conrelid
            WHERE cl.relname = 'toilet_complaints' AND c.contype = 'c';
        `);
        console.log(JSON.stringify(results, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

checkConstraint();
