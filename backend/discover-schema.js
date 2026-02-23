import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

async function discover() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database');

        const tables = [
            'toilet_facilities',
            'toilet_inspections',
            'toilet_maintenance',
            'toilet_staff_assignments',
            'toilet_complaints',
            'mrf_facilities',
            'gau_shala_cattle',
            'gau_shala_complaints',
            'gau_shala_facilities',
            'gau_shala_feeding_records',
            'gau_shala_inspections'
        ];

        const schema = {};

        for (const table of tables) {
            console.log(`Discovering table: ${table}`);
            const [results] = await sequelize.query(`
                SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = '${table}'
                ORDER BY ordinal_position;
            `);

            schema[table] = results;
        }

        fs.writeFileSync('database_schema.json', JSON.stringify(schema, null, 2));
        console.log('Schema saved to database_schema.json');

        await sequelize.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

discover();
