import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const InventoryTransaction = sequelize.define('InventoryTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    inventory_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'inventory_items',
            key: 'id'
        }
    },
    transaction_type: {
        type: DataTypes.ENUM('in', 'out'),
        allowNull: false
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    transaction_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    performed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    facility_id: {
        type: DataTypes.INTEGER, // Generic ID for toilet/mrf/gaushala
        allowNull: true
    },
    facility_type: {
        type: DataTypes.STRING(20), // 'toilet', 'mrf', 'gaushala'
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'inventory_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
