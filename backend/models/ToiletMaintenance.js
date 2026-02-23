import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ToiletMaintenance = sequelize.define('ToiletMaintenance', {
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
    type: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    scheduledDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    completedDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    assignedStaffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'admin_management',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'scheduled'
    },
    priority: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'normal'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    materialsUsed: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    photos: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    }
}, {
    tableName: 'toilet_maintenance',
    timestamps: true
});
