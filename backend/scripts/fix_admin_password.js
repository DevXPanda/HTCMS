
import { sequelize } from '../config/database.js';
import { User } from '../models/index.js';

async function resetAdminPassword() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const email = 'nktechipl@gmail.com';
        const newPassword = 'admin123'; // Temporary password for recovery

        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            return;
        }

        console.log(`Found user: ${user.email} (ID: ${user.id})`);

        // Update password
        user.password = newPassword;
        await user.save();

        console.log(`Password for ${email} has been reset to: ${newPassword}`);

        // Verify immediately
        const isMatch = await user.comparePassword(newPassword);
        console.log(`Verification: Password match is ${isMatch}`);

        if (isMatch) {
            console.log('SUCCESS: Admin password reset successfully.');
        } else {
            console.error('FAILURE: Password reset verification failed.');
        }

    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await sequelize.close();
    }
}

resetAdminPassword();
