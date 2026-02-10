
import { sequelize } from '../config/database.js';

async function listEnums() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const [results, metadata] = await sequelize.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE 'enum_%'
      ORDER BY t.typname, e.enumsortorder;
    `);

        console.log('Enum types found:', JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('Failed to list enums:', error);
    } finally {
        await sequelize.close();
    }
}

listEnums();
