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

const GAU_SHALA_VALUES = [
    'GauShalaFacility',
    'GauShalaCattle',
    'GauShalaInspection',
    'GauShalaFeedingRecord',
    'GauShalaComplaint'
];

async function applyChanges() {
    try {
        console.log('--- Applying Enum Changes ---');

        // Postgres doesn't support IF NOT EXISTS for ADD VALUE directly in older versions (before 9.3)
        // or inside transactions for ALTER TYPE ADD VALUE.
        // However, HTCMS uses a modern PG. We'll check for existence before adding to be safe.

        const { rows } = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'audit_entity_type';
    `);

        const existingValues = rows.map(r => r.enumlabel);

        for (const value of GAU_SHALA_VALUES) {
            if (!existingValues.includes(value)) {
                console.log(`Adding missing value: ${value}`);
                // ALTER TYPE ADD VALUE cannot be executed in a transaction block
                await pool.query(`ALTER TYPE audit_entity_type ADD VALUE '${value}'`);
            } else {
                console.log(`Value already exists: ${value}`);
            }
        }

        console.log('✅ Changes applied successfully');
    } catch (err) {
        console.error('❌ Error applying changes:', err.message);
    } finally {
        await pool.end();
    }
}

applyChanges();
