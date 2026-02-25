import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MrfFacility = sequelize.define('MrfFacility', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    ward_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'wards',
            key: 'id'
        }
    },
    location: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    capacity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    operating_hours: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    contact_person: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    contact_number: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    supervisor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_management',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    waste_types: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active'
    }
}, {
    tableName: 'mrf_facilities',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['supervisor_id']
        },
        {
            fields: ['status']
        }
    ]
});
