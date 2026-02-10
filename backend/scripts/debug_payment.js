import { AdminManagement } from '../models/index.js';
import { sequelize } from '../config/database.js';

async function checkAdminManagement() {
    try {
        const staff = await AdminManagement.findByPk(46);
        if (staff) {
            console.log(`Staff 46 Found:`);
            console.log(`Role: ${staff.role}`);
            // Check if AdminManagement has name fields. Usually it links to User, but maybe it has redundant fields?
            console.log('Fields:', JSON.stringify(staff.toJSON(), null, 2));
        } else {
            console.log('Staff 46 not found in AdminManagement');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkAdminManagement();
