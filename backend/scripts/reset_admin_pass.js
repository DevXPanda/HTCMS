
import { sequelize } from '../config/database.js';
import { User } from '../models/index.js';

async function resetAdminPassword() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const admin = await User.findOne({ where: { email: 'nktechipl@gmail.com' } });
        if (!admin) {
            console.log('Admin user not found!');
            return;
        }

        admin.password = 'password123';
        // The User model likely has a beforeSave hook to hash the password
        await admin.save();

        console.log('Successfully reset admin password to "password123".');

    } catch (error) {
        console.error('Failed to reset password:', error);
    } finally {
        await sequelize.close();
    }
}

resetAdminPassword();
