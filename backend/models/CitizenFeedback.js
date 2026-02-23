import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CitizenFeedback = sequelize.define('CitizenFeedback', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    facility_type: {
        type: DataTypes.STRING(20), // 'toilet', 'gaushala'
        allowNull: false
    },
    facility_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    citizen_name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    citizen_phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    feedback_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'citizen_feedback',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
