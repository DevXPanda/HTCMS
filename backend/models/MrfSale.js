import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MrfSale = sequelize.define('MrfSale', {
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
        }
    },
    sale_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    buyer_name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    material_type: {
        type: DataTypes.STRING(50), // 'plastic', 'paper', 'metal', etc.
        allowNull: false
    },
    weight_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    rate_per_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    invoice_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'mrf_sales',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
