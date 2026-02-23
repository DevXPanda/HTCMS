import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const GauShalaFacility = sequelize.define('GauShalaFacility', {
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
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'active'
    }
}, {
    tableName: 'gau_shala_facilities',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
