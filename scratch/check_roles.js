
import { AdminManagement } from './backend/models/AdminManagement.js';
import { sequelize } from './backend/config/database.js';

async function checkRoles() {
  try {
    await sequelize.authenticate();
    const admins = await AdminManagement.findAll({
      attributes: ['id', 'full_name', 'role'],
      raw: true
    });
    console.log('Admins in DB:', admins);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRoles();
