
import { sequelize } from '../config/database.js';

async function checkEnum() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        const enumName = 'audit_action_type_enum';

        // Check values
        const [results] = await sequelize.query(`
      SELECT unnest(enum_range(NULL::${enumName})) as value
    `);

        const values = results.map(r => r.value);
        console.log(`Values in ${enumName}:`, values);

        if (values.includes('PAYMENT_COLLECTED')) {
            console.log('PAYMENT_COLLECTED is present.');
        } else {
            console.log('PAYMENT_COLLECTED is MISSING.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkEnum();
