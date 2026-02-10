
import { sequelize } from '../config/database.js';

async function listEnums() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        const [results] = await sequelize.query(`
      SELECT t.typname 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      GROUP BY t.typname;
    `);

        console.log('Enums found in database:', results.map(r => r.typname));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

listEnums();
