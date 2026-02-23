import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const GauShalaInspection = sequelize.define('GauShalaInspection', {
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
    inspection_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    inspector_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    findings: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    veterinary_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    next_inspection_due: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'completed'
    }
}, {
    tableName: 'gau_shala_inspections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
