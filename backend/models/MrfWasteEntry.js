import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MrfWasteEntry = sequelize.define('MrfWasteEntry', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    mrf_facility_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'mrf_facilities',
            key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'mrf_facility_id'
    },
    entry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'entry_date'
    },
    waste_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'waste_type'
    },
    quantity_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'quantity_kg'
    },
    source: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'source'
    },
    received_by_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_management',
            key: 'id'
        },
        onDelete: 'SET NULL',
        field: 'received_by_id'
    }
}, {
    tableName: 'mrf_waste_entries',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['mrf_facility_id']
        },
        {
            fields: ['entry_date']
        },
        {
            fields: ['waste_type']
        },
        {
            fields: ['received_by_id']
        }
    ]
});
