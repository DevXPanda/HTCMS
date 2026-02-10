
import { sequelize } from '../config/database.js';
import { User } from '../models/index.js';

async function debugAdmin() {
    try {
        await sequelize.authenticate();
        console.log('DB Connection OK');

        const email = 'nktechipl@gmail.com';
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.log('User NOT FOUND');
        } else {
            console.log(`User ID: ${user.id}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Active: ${user.isActive}`);
            const pass = user.password || '';
            console.log(`Pass Len: ${pass.length}`);
            console.log(`Pass Prefix: ${pass.substring(0, 4)}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

debugAdmin();
