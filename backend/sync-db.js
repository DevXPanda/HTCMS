import { sequelize } from './config/database.js';
import './models/index.js'; // Ensure all models are registered

const syncDB = async () => {
    try {

        await sequelize.authenticate();


        await sequelize.sync({ alter: true });

        process.exit(0);
    } catch (error) {
        console.error('Database synchronization failed:', error);
        process.exit(1);
    }
};

syncDB();
