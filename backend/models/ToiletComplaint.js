import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ToiletComplaint = sequelize.define('ToiletComplaint', {
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
    citizenName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    citizenPhone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    citizenEmail: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    complaintType: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'medium'
    },
    assignedTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_management',
            key: 'id'
        }
    },
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resolutionNotes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    photos: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    }
}, {
    tableName: 'toilet_complaints',
    timestamps: true
});
