import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const GauShalaComplaint = sequelize.define('GauShalaComplaint', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    gau_shala_facility_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'gau_shala_facilities',
            key: 'id'
        }
    },
    complainant_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    complainant_phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
    },
    priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'medium'
    },
    resolution_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    resolved_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'gau_shala_complaints',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
