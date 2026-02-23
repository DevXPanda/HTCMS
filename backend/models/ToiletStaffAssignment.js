import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ToiletStaffAssignment = sequelize.define('ToiletStaffAssignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    toiletFacilityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'toilet_facilities',
            key: 'id'
        }
    },
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admin_management',
            key: 'id'
        }
    },
    role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Cleaner'
    },
    shift: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    assignedDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    unassignedDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'toilet_staff_assignments',
    timestamps: true
});
