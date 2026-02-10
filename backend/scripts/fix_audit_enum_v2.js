
import { sequelize } from '../config/database.js';

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Use a DO block to safely add the value if it doesn't exist
        // This handles the "IF NOT EXISTS" logic which is only available in newer Postgres versions for ALTER TYPE
        // or provides a workaround for older ones.
        // However, since we saw "enum_audit_logs_entityType" in the list, we can try the standard command first.
        // If that fails, we can try without quotes or check the exact error.

        // Let's try the standard command again but catching the specific error.
        try {
            await sequelize.query("ALTER TYPE \"enum_audit_logs_entityType\" ADD VALUE 'D2DC';");
            console.log("Successfully added 'D2DC' to enum_audit_logs_entityType.");
        } catch (e) {
            if (e.original && e.original.code === '42710') {
                console.log("'D2DC' already exists in enum_audit_logs_entityType.");
            } else {
                throw e;
            }
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
