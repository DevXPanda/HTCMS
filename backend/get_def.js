import { sequelize } from './config/database.js';
async function run() {
    const [results] = await sequelize.query(`
        SELECT pg_get_constraintdef(c.oid) as def
        FROM pg_constraint c
        JOIN pg_class cl ON cl.oid = c.conrelid
        WHERE cl.relname = 'toilet_complaints' AND c.conname = 'toilet_complaints_complaintType_check';
    `);
    const def = results[0].def;
    console.log("CONSTRAINT_START");
    console.log(def);
    console.log("CONSTRAINT_END");
    process.exit(0);
}
run();
