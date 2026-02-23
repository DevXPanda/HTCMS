import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Tax Demand Model
// Note: Model name remains 'Demand' for backward compatibility
// Display name is 'Tax Demand' throughout the system
export const Demand = sequelize.define('Demand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  demandNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Properties',
      key: 'id'
    }
  },
  assessmentId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable for D2DC and WATER_TAX demands
    references: {
      model: 'Assessments',
      key: 'id'
    },
    comment: 'Assessment ID (required for HOUSE_TAX, null for D2DC and WATER_TAX)'
  },
  waterTaxAssessmentId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable, only for WATER_TAX demands
    references: {
      model: 'WaterTaxAssessments',
      key: 'id'
    },
    comment: 'Water Tax Assessment ID (required for WATER_TAX, null for others)'
  },
  shopTaxAssessmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ShopTaxAssessments',
      key: 'id'
    },
    comment: 'Shop Tax Assessment ID (required for SHOP_TAX, null for others)'
  },
  serviceType: {
    type: DataTypes.ENUM('HOUSE_TAX', 'D2DC', 'WATER_TAX', 'SHOP_TAX'),
    allowNull: false,
    defaultValue: 'HOUSE_TAX',
    comment: 'Service type: HOUSE_TAX, D2DC, WATER_TAX, or SHOP_TAX'
  },
  financialYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Format: 2024-25'
  },
  baseAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Base tax amount from assessment'
  },
  arrearsAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Arrears from previous years'
  },
  penaltyAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Penalty for late payment'
  },
  interestAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Interest on overdue amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total amount due (base + arrears + penalty + interest)'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Total amount paid so far'
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Balance amount to be paid'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'partially_paid', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  generatedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastPenaltyAppliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last date when penalty/interest was applied'
  },
  overdueDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of days overdue'
  },
  penaltyBreakdown: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'JSON array tracking penalty/interest history: [{date, penalty, interest, reason}]'
  },
  penaltyWaived: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    allowNull: true,
    field: 'penalty_waived',
    comment: 'Amount of penalty waived by approval'
  },
  finalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'final_amount',
    comment: 'Final payable after discount/waiver (original_amount + remaining penalty - discount)'
  }
}, {
  tableName: 'demands',
  timestamps: true,
  hooks: {
    beforeValidate: (demand) => {
      // CRITICAL VALIDATION: Ensure assessmentId rules based on serviceType
      // D2DC is a municipal service, NOT a tax assessment

      // Default serviceType to HOUSE_TAX for backward compatibility
      const serviceType = demand.serviceType || 'HOUSE_TAX';

      if (serviceType === 'D2DC') {
        // D2DC demands MUST have assessmentId = null
        // D2DC is linked directly to property, not assessment
        if (demand.assessmentId !== null && demand.assessmentId !== undefined) {
          throw new Error('D2DC demands cannot have an assessmentId. D2DC is a municipal service linked directly to property, not assessment.');
        }
        // Explicitly set to null to ensure database constraint compliance
        demand.assessmentId = null;
        demand.waterTaxAssessmentId = null;
        demand.shopTaxAssessmentId = null;
      } else if (serviceType === 'HOUSE_TAX') {
        // HOUSE_TAX demands MUST have assessmentId
        // HOUSE_TAX is generated from approved tax assessments
        // EXCEPTION: Unified demands may have both assessments stored in demand items
        // Check if this is a unified demand (has UNIFIED_DEMAND in remarks)
        let isUnifiedDemand = false;

        if (demand.remarks) {
          if (typeof demand.remarks === 'string') {
            // Check if it's a JSON string containing UNIFIED_DEMAND
            try {
              const remarksObj = JSON.parse(demand.remarks);
              isUnifiedDemand = remarksObj.type === 'UNIFIED_DEMAND' ||
                (typeof remarksObj === 'string' && remarksObj.includes('UNIFIED_DEMAND'));
            } catch (e) {
              // If it's not valid JSON, check as simple string
              isUnifiedDemand = demand.remarks.includes('UNIFIED_DEMAND');
            }
          } else if (typeof demand.remarks === 'object') {
            // If it's already an object
            isUnifiedDemand = demand.remarks.type === 'UNIFIED_DEMAND';
          }
        }

        if (!isUnifiedDemand && !demand.assessmentId) {
          throw new Error('HOUSE_TAX demands require an assessmentId. Please provide a valid assessment.');
        }
        // For unified demands:
        // - If property assessment exists, assessmentId should be set
        // - If only water assessments exist, assessmentId can be null (will use WATER_TAX serviceType)
        // - We allow waterTaxAssessmentId to be set for unified demands
        // The actual breakdown is stored in demand items
        if (!isUnifiedDemand) {
          demand.waterTaxAssessmentId = null;
          demand.shopTaxAssessmentId = null;
        }
      } else if (serviceType === 'WATER_TAX') {
        // WATER_TAX demands MUST have waterTaxAssessmentId
        // WATER_TAX is generated from approved water tax assessments
        if (!demand.waterTaxAssessmentId) {
          throw new Error('WATER_TAX demands require a waterTaxAssessmentId. Please provide a valid water tax assessment.');
        }
        demand.assessmentId = null;
        demand.shopTaxAssessmentId = null;
      } else if (serviceType === 'SHOP_TAX') {
        // SHOP_TAX demands MUST have shopTaxAssessmentId
        if (!demand.shopTaxAssessmentId) {
          throw new Error('SHOP_TAX demands require a shopTaxAssessmentId. Please provide a valid shop tax assessment.');
        }
        demand.assessmentId = null;
        demand.waterTaxAssessmentId = null;
      }
    },
    afterFind: (demands) => {
      // Ensure numeric fields are always numbers, not strings
      // This handles cases where Sequelize returns DECIMAL as strings
      if (!demands) return;

      const normalizeDemand = (demand) => {
        if (!demand || typeof demand !== 'object') return;

        // Convert DECIMAL fields to numbers
        if (demand.baseAmount !== undefined) demand.baseAmount = parseFloat(demand.baseAmount) || 0;
        if (demand.arrearsAmount !== undefined) demand.arrearsAmount = parseFloat(demand.arrearsAmount) || 0;
        if (demand.penaltyAmount !== undefined) demand.penaltyAmount = parseFloat(demand.penaltyAmount) || 0;
        if (demand.interestAmount !== undefined) demand.interestAmount = parseFloat(demand.interestAmount) || 0;
        if (demand.totalAmount !== undefined) demand.totalAmount = parseFloat(demand.totalAmount) || 0;
        if (demand.paidAmount !== undefined) demand.paidAmount = parseFloat(demand.paidAmount) || 0;
        if (demand.balanceAmount !== undefined) demand.balanceAmount = parseFloat(demand.balanceAmount) || 0;
        if (demand.penaltyWaived !== undefined) demand.penaltyWaived = parseFloat(demand.penaltyWaived) || 0;
        if (demand.finalAmount !== undefined) demand.finalAmount = parseFloat(demand.finalAmount) || 0;
        if (demand.overdueDays !== undefined) demand.overdueDays = parseInt(demand.overdueDays) || 0;
      };

      if (Array.isArray(demands)) {
        demands.forEach(normalizeDemand);
      } else {
        normalizeDemand(demands);
      }
    }
  }
});
