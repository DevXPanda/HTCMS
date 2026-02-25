import { sequelize } from './config/database.js';
async function run() {
    const [results] = await sequelize.query(`
        SELECT pg_get_constraintdef(c.oid) as def
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'toilet_complaints' AND c.conname = 'toilet_complaints_status_check';
    `);
    const def = results[0].def;
    const values = def.match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
    console.log(JSON.stringify(values));
    process.exit(0);
}
run();
