import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const GauShalaCattle = sequelize.define('GauShalaCattle', {
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
    tag_number: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    animal_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'cow'
    },
    gender: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    health_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'healthy'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'gau_shala_cattle',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
