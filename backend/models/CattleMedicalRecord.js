import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CattleMedicalRecord = sequelize.define('CattleMedicalRecord', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    gau_shala_cattle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'gau_shala_cattle',
            key: 'id'
        }
    },
    record_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    record_type: {
        type: DataTypes.STRING(50), // 'vaccination', 'deworming', 'treatment', 'checkup'
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    medications: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    veterinarian_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    next_followup_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    cost: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    }
}, {
    tableName: 'cattle_medical_records',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
