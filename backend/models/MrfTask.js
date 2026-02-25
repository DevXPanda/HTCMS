import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MrfTask = sequelize.define('MrfTask', {
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
    supervisor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_management',
            key: 'id'
        },
        onDelete: 'SET NULL',
        field: 'supervisor_id'
    },
    task_type: {
        type: DataTypes.ENUM('Sorting', 'Baling', 'Composting', 'Dispatch', 'Maintenance'),
        allowNull: false,
        field: 'task_type'
    },
    status: {
        type: DataTypes.ENUM('Assigned', 'In Progress', 'Completed'),
        allowNull: false,
        defaultValue: 'Assigned',
        field: 'status'
    },
    assigned_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'assigned_date'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'remarks'
    }
}, {
    tableName: 'mrf_tasks',
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
            fields: ['supervisor_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['assigned_date']
        }
    ]
});
