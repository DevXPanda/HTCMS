
import { sequelize } from '../config/database.js';
import { User } from '../models/index.js';

async function listAdmins() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const admins = await User.findAll({
            where: { role: 'admin' },
            attributes: ['id', 'email', 'firstName', 'lastName', 'role']
        });

        console.log('Admin Users:', JSON.stringify(admins, null, 2));

    } catch (error) {
        console.error('Failed to list admins:', error);
    } finally {
        await sequelize.close();
    }
}

listAdmins();
