import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PropertyApplication = sequelize.define('PropertyApplication', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    applicationNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique application number'
    },
    applicantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Citizen or entity applying for property registration'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Clerk who created this application'
    },
    wardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'wards',
            key: 'id'
        }
    },
    ownerName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Property owner name'
    },
    ownerPhone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    propertyType: {
        type: DataTypes.ENUM('residential', 'commercial', 'industrial', 'agricultural', 'mixed'),
        allowNull: false
    },
    usageType: {
        type: DataTypes.ENUM('residential', 'commercial', 'industrial', 'agricultural', 'mixed', 'institutional'),
        allowNull: true,
        comment: 'Actual usage type of the property'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    pincode: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    area: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Area in square meters'
    },
    builtUpArea: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    floors: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1
    },
    constructionType: {
        type: DataTypes.ENUM('RCC', 'Pucca', 'Kutcha', 'Semi-Pucca'),
        allowNull: true
    },
    constructionYear: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    occupancyStatus: {
        type: DataTypes.ENUM('owner_occupied', 'tenant_occupied', 'vacant'),
        defaultValue: 'owner_occupied'
    },
    geolocation: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Stores {latitude, longitude} coordinates'
    },
    photos: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of photo URLs/paths'
    },
    documents: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of document URLs/paths with metadata'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Remarks from clerk or applicant'
    },
    inspectionRemarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Remarks from assessor during inspection'
    },
    rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason for rejection if status is REJECTED'
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'UNDER_INSPECTION', 'ESCALATED_TO_OFFICER', 'APPROVED', 'REJECTED', 'RETURNED'),
        allowNull: false,
        defaultValue: 'DRAFT',
        comment: 'Application workflow status'
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When application was submitted for inspection'
    },
    inspectedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Assessor who inspected the application'
    },
    inspectedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When inspection was completed'
    },
    escalatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Inspector who escalated the application to officer'
    },
    escalatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When application was escalated to officer'
    },
    approvedPropertyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'properties',
            key: 'id'
        },
        field: 'approvedPropertyId',
        comment: 'Property ID created after approval'
    },
    officerremarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'officerremarks',
        comment: 'Remarks from officer when making final decision'
    },
    decidedby: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'decidedby',
        comment: 'Officer who made the final decision'
    },
    decidedat: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'decidedat',
        comment: 'When officer made the final decision'
    }
}, {
    tableName: 'property_applications',
    timestamps: true
});
