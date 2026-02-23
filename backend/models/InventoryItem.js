import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const InventoryItem = sequelize.define('InventoryItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: false // e.g., 'cleaning', 'fodder', 'medical', 'spare_parts'
    },
    unit: {
        type: DataTypes.STRING(20), // e.g., 'kg', 'ltr', 'pcs'
        allowNull: false
    },
    current_stock: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    min_stock_level: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    module: {
        type: DataTypes.STRING(20), // 'toilet', 'mrf', 'gaushala', 'general'
        allowNull: false
    }
}, {
    tableName: 'inventory_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
