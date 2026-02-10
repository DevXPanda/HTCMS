import { sequelize } from '../config/database.js';
import '../models/index.js'; // Import all models
import { D2DCRecord } from '../models/D2DCRecord.js';

const syncD2DC = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Sync only D2DCRecord table
        // This will create the table if it doesn't exist
        await D2DCRecord.sync({ alter: true });

        console.log('D2DCRecord table synced successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to sync D2DCRecord:', error);
        process.exit(1);
    }
};

syncD2DC();
