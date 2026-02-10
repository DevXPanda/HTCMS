
import { sequelize } from '../config/database.js';

async function fixEnum() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Based on error: "invalid input value for enum audit_action_type_enum"
        const enumName = 'audit_action_type_enum';
        const newValue = 'PAYMENT_COLLECTED';

        console.log(`Attempting to add '${newValue}' to '${enumName}'...`);

        // Check if value already exists
        // Note: unnest(enum_range(NULL::enum_name)) works if the type exists
        try {
            const [results] = await sequelize.query(`
          SELECT unnest(enum_range(NULL::${enumName})) as value
        `);

            const existingValues = results.map(r => r.value);

            if (existingValues.includes(newValue)) {
                console.log(`Value '${newValue}' already exists in enum '${enumName}'. Skipping.`);
            } else {
                await sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE '${newValue}';`);
                console.log(`Successfully added '${newValue}' to enum '${enumName}'.`);
            }
        } catch (checkError) {
            console.error(`Error checking enum '${enumName}':`, checkError.message);
            // Fallback strategies if the name is slightly different (e.g. quotes, casing)

            // Try with double quotes if case sensitivity is an issue, though usually postgres lowercases unless quoted creation
            // The error message usually prints the name exactly as postgres sees it.
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

fixEnum();
