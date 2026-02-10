
import { sequelize } from '../config/database.js';

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Add 'D2DC' to the enum type in the database
        // PostgreSQL specific syntax for enum modification
        await sequelize.query("ALTER TYPE \"enum_audit_logs_entityType\" ADD VALUE IF NOT EXISTS 'D2DC';");

        console.log("Successfully added 'D2DC' to enum_audit_logs_entityType.");
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
