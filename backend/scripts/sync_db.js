import { sequelize } from '../config/database.js';
import '../models/index.js'; // Import all models to register them

const syncDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Sync models
        // Use { alter: true } to update tables without dropping them
        await sequelize.sync({ alter: true });

        console.log('Database synced successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to sync database:', error);
        process.exit(1);
    }
};

syncDB();
