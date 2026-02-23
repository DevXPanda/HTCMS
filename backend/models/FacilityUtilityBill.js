import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FacilityUtilityBill = sequelize.define('FacilityUtilityBill', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    facility_type: {
        type: DataTypes.STRING(20), // 'toilet', 'mrf', 'gaushala'
        allowNull: false
    },
    facility_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    utility_type: {
        type: DataTypes.STRING(20), // 'water', 'electricity'
        allowNull: false
    },
    bill_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    reading_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    bill_number: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    payment_status: {
        type: DataTypes.ENUM('paid', 'unpaid', 'partially_paid'),
        defaultValue: 'unpaid'
    },
    receipt_url: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'facility_utility_bills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
