import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ToiletFacility = sequelize.define('ToiletFacility', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    location: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    wardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'wards',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Public'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active'
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    openingHours: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '6:00 AM - 10:00 PM'
    },
    contactPerson: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    contactNumber: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    amenities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: []
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'toilet_facilities',
    timestamps: true
});
