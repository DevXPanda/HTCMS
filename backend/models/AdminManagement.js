import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const AdminManagement = sequelize.define('AdminManagement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  employee_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  role: {
    type: DataTypes.ENUM('CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN'),
    allowNull: false
  },
  phone_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  ward_ids: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: true,
    defaultValue: []
  },
  assigned_ulb: { type: DataTypes.STRING(255), allowNull: true },
  ulb_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'ulbs', key: 'id' } },
  ward_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'wards', key: 'id' } },
  eo_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'admin_management', key: 'id' } },
  contractor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'admin_management', key: 'id' } },
  worker_type: { type: DataTypes.STRING(20), allowNull: true },
  supervisor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'admin_management', key: 'id' } },
  company_name: { type: DataTypes.STRING(255), allowNull: true },
  contact_details: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active'
  },
  created_by_admin_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  password_changed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'admin_management',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (adminManagement) => {
      if (adminManagement.password) {
        const salt = await bcrypt.genSalt(10);
        adminManagement.password = await bcrypt.hash(adminManagement.password, salt);
      }
    },
    beforeUpdate: async (adminManagement) => {
      if (adminManagement.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        adminManagement.password = await bcrypt.hash(adminManagement.password, salt);
        adminManagement.password_changed = true;
      }
    }
  }
});

// Instance method to compare password
AdminManagement.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get display name
AdminManagement.prototype.getDisplayName = function () {
  return this.full_name;
};

// Static method to generate employee ID
AdminManagement.generateEmployeeId = async (role, attempt = 1) => {
  // Normalize role to uppercase for prefix lookup
  const normalizedRole = role ? role.toUpperCase().replace(/-/g, '_') : role;
  
  const prefixes = {
    CLERK: 'CLK',
    INSPECTOR: 'INSP',
    OFFICER: 'OFF',
    COLLECTOR: 'COL',
    EO: 'EO',
    SUPERVISOR: 'SUP',
    FIELD_WORKER: 'FW',
    CONTRACTOR: 'CON',
    ADMIN: 'ADM'
  };

  const prefix = prefixes[normalizedRole];
  if (!prefix) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Prevent infinite recursion
  if (attempt > 10) {
    throw new Error('Unable to generate unique employee ID after 10 attempts');
  }

  try {
    // Get the count of existing employees with the same role (normalize for comparison)
    const count = await AdminManagement.count({
      where: {
        role: normalizedRole
      }
    });

    // Generate employee ID with attempt-based offset to avoid conflicts
    const employeeId = `${prefix}-${String(count + attempt).padStart(4, '0')}`;
    
    // Double-check if this ID already exists (race condition protection)
    const existing = await AdminManagement.findOne({
      where: { employee_id: employeeId }
    });

    if (existing) {
      // If it exists, try with a higher number (recursive call with attempt counter)
      return AdminManagement.generateEmployeeId(role, attempt + 1);
    }

    return employeeId;
  } catch (error) {
    throw new Error(`Error generating employee ID: ${error.message}`);
  }
};

// Static method to generate random password
AdminManagement.generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Static method to find employee by multiple identifiers
AdminManagement.findByIdentifier = async (identifier) => {
  console.log(`🔍 Searching admin_management table for identifier: ${identifier}`);
  
  const result = await AdminManagement.findOne({
    where: {
      [sequelize.Sequelize.Op.or]: [
        { employee_id: identifier },
        { email: identifier },
        { phone_number: identifier },
        { username: identifier }
      ]
    }
  });

  if (result) {
    console.log(`✅ Found employee: ${result.employee_id} (${result.role})`);
  } else {
    console.log(`❌ No employee found for identifier: ${identifier}`);
  }

  return result;
};
