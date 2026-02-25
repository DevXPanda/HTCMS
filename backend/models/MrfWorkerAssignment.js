import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MrfWorkerAssignment = sequelize.define('MrfWorkerAssignment', {
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
        },
        onDelete: 'CASCADE',
        field: 'mrf_facility_id'
    },
    worker_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'workers',
            key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'worker_id'
    },
    shift: {
        type: DataTypes.ENUM('MORNING', 'EVENING'),
        allowNull: false,
        field: 'shift'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isActive'
    }
}, {
    tableName: 'mrf_worker_assignments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['mrf_facility_id']
        },
        {
            fields: ['worker_id']
        },
        {
            unique: true,
            fields: ['worker_id', 'shift'],
            where: {
                isActive: true
            }
        }
    ]
});
