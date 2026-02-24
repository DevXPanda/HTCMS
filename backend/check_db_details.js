import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
});

async function checkDetails() {
    try {
        console.log('--- DATABASE STATUS ---');
        const dbRes = await pool.query('SELECT current_database(), current_schema()');
        console.log(`Database: ${dbRes.rows[0].current_database}, Schema: ${dbRes.rows[0].current_schema}`);

        console.log('\n--- audit_entity_type ENUM VALUES ---');
        const enumRes = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'audit_entity_type'
      ORDER BY enumlabel;
    `);

        if (enumRes.rows.length === 0) {
            console.log('ENUM audit_entity_type NOT FOUND!');
        } else {
            enumRes.rows.forEach(row => console.log(`'${row.enumlabel}'`));
        }

        console.log('\n--- audit_logs TABLE DEFINITION ---');
        const tableRes = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' AND column_name = 'entityType';
    `);
        tableRes.rows.forEach(row => console.log(`Column: ${row.column_name}, Data Type: ${row.data_type}, UDT Name: ${row.udt_name}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkDetails();
