import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const D2DCRecord = sequelize.define('D2DCRecord', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('DEMAND_GENERATION', 'PAYMENT_COLLECTION'),
        allowNull: false
    },
    collectorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    propertyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'properties',
            key: 'id'
        }
    },
    wardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'wards',
            key: 'id'
        }
    },
    demandId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'demands',
            key: 'id'
        }
    },
    paymentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'payments',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    location: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Capture GPS coordinates {lat, long} if available'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'd2dc_records',
    timestamps: true,
    indexes: [
        {
            fields: ['collectorId']
        },
        {
            fields: ['wardId']
        },
        {
            fields: ['type']
        },
        {
            fields: ['timestamp']
        }
    ]
});
