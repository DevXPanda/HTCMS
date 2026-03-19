import { DataTypes, Op } from 'sequelize';
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
  // Deprecated roles (kept for future use): Clerk, Inspector, Officer, Contractor. Active: EO, Supervisor, Collector, Field Worker, SFI, SBM (global monitoring).
  role: {
    type: DataTypes.ENUM('CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN', 'SFI', 'SBM', 'ACCOUNT_OFFICER'),
    allowNull: false
  },
  // SBM only: when true, full CRUD; when false, read-only across all modules (Super Admin can toggle on creation).
  full_crud_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  },
  // Supervisor only: assigned modules e.g. ['toilet', 'mrf', 'gaushala'] for Toilet Management, MRF, Gau Shala
  assigned_modules: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
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

  // Deprecated roles (kept for future use): Clerk, Inspector, Officer, Contractor - prefixes retained for existing IDs
  const prefixes = {
    CLERK: 'CLK',
    INSPECTOR: 'INSP',
    OFFICER: 'OFF',
    COLLECTOR: 'COL',
    EO: 'EO',
    SUPERVISOR: 'SUP',
    FIELD_WORKER: 'FW',
    CONTRACTOR: 'CON',
    ADMIN: 'ADM',
    SFI: 'SFI',
    SBM: 'SBM',
    ACCOUNT_OFFICER: 'AOF'
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
    // Find max existing number for this prefix to avoid duplicates (count can be wrong with deletes/race)
    const existing = await AdminManagement.findAll({
      where: {
        role: normalizedRole,
        employee_id: { [Op.like]: `${prefix}-%` }
      },
      attributes: ['employee_id'],
      raw: true
    });
    const numbers = existing
      .map((row) => {
        const match = (row.employee_id || '').match(/^(.+)-(\d+)$/);
        return match ? parseInt(match[2], 10) : 0;
      })
      .filter((n) => !Number.isNaN(n));
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + attempt;
    const employeeId = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    // Double-check if this ID already exists (race condition protection)
    const existingId = await AdminManagement.findOne({
      where: { employee_id: employeeId }
    });

    if (existingId) {
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

  } else {

  }

  return result;
};
