import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ToiletComplaint = sequelize.define('ToiletComplaint', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    toiletFacilityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'toilet_facilities',
            key: 'id'
        }
    },
    citizenName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    citizenPhone: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    citizenEmail: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    complaintType: {
        type: DataTypes.STRING(20),
        allowNull: false
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
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'medium'
    },
    assignedTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'admin_management',
            key: 'id'
        }
    },
    resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resolutionNotes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    photos: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    workerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'workers',
            key: 'id'
        }
    },
    resolutionPhotos: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
    },
    // New Detailed Proof Fields
    resolution_before_photo: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    resolution_before_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    resolution_before_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    resolution_before_address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    resolution_after_photo: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    resolution_after_lat: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    resolution_after_lng: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    resolution_after_address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_escalated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    escalation_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'toilet_complaints',
    timestamps: true,
    paranoid: true
});
