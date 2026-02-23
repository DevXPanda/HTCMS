import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ToiletInspection = sequelize.define('ToiletInspection', {
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
    inspectionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    inspectorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    cleanliness: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    maintenance: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    waterSupply: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    electricity: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    ventilation: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    lighting: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    photos: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'toilet_inspections',
    timestamps: true
});
