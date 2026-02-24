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
        console.log('--- Table: audit_logs Column: entityType ---');
        const columnRes = await pool.query(`
      SELECT column_name, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' AND column_name = 'entityType';
    `);
        columnRes.rows.forEach(row => console.log(`Column: ${row.column_name}, Type: ${row.udt_name}`));

        console.log('\n--- Enum values for audit_entity_type ---');
        const enumRes = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'audit_entity_type'
      ORDER BY enumlabel;
    `);
        enumRes.rows.forEach(row => console.log(`- ${row.enumlabel}`));

        console.log('\n--- Enum values for enum_audit_logs_entityType (if exists) ---');
        const enum2Res = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'enum_audit_logs_entityType'
      ORDER BY enumlabel;
    `);
        enum2Res.rows.forEach(row => console.log(`- ${row.enumlabel}`));

    } catch (err) {
        console.error('Error checking details:', err);
    } finally {
        await pool.end();
    }
}

checkDetails();
