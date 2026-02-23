import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const GauShalaFeedingRecord = sequelize.define('GauShalaFeedingRecord', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    gau_shala_facility_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'gau_shala_facilities',
            key: 'id'
        }
    },
    record_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fodder_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    quantity: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'gau_shala_feeding_records',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
