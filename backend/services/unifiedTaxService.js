import { Assessment, WaterTaxAssessment, Demand, DemandItem, Property, WaterConnection, User, Ward, Shop, ShopTaxAssessment } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  getActivePenaltyRule,
  calculateOverdueDays,
  shouldApplyPenalty,
  calculatePenalty,
  calculateInterest
} from './penaltyCalculator.js';
import { getOrCreateAssessmentAndComputeAmounts as getPropertyDemandData } from './propertyDemandService.js';
import { getOrCreateAssessmentsAndComputeAmounts as getWaterDemandData, calculateWaterTaxAmount } from './waterDemandService.js';
import { generateShopDemandsForProperty } from './shopDemandService.js';
import { generateD2DCDemandForProperty } from './d2dcDemandService.js';

/**
 * Unified Tax Demand Service (orchestrator only).
 * Does not calculate taxes directly; calls per-service demand generation logic.
 * 
 * Creates:
 * - ONE unified demand with DemandItems (Property + Water) - always created
 * - Optional: Separate Shop demands (one per shop) - if includeShopDemands=true
 * - Optional: Separate D2DC demand - if includeD2DCDemand=true
 * 
 * Shop and D2DC create their own Demand records (not DemandItems).
 */

/**
 * Generate unified tax demand by orchestrating Property, Water, Shop, and D2DC demand services.
 *
 * @param {number} propertyId - Property ID
 * @param {number} assessmentYear - Assessment year
 * @param {string} financialYear - Financial year (e.g., "2024-25")
 * @param {number} assessorId - User ID of assessor
 * @param {Date} dueDate - Due date for the demand
 * @param {string} remarks - Optional remarks
 * @param {boolean} includeShopDemands - Optional: generate shop demands for active shops (default: false)
 * @param {boolean} includeD2DCDemand - Optional: generate D2DC demand (default: false)
 * @param {string} d2dcMonth - Required if includeD2DCDemand=true (format: "YYYY-MM")
 * @param {number} d2dcBaseAmount - Optional D2DC base amount (default: 50)
 * @returns {Promise<Object>} Unified demand + optional shop/D2DC demands
 */
export const generateUnifiedTaxAssessmentAndDemand = async ({
  propertyId,
  assessmentYear,
  financialYear,
  assessorId,
  dueDate = null,
  remarks = null,
  defaultTaxRate = 1.5,
  includeShopDemands = false,
  includeD2DCDemand = false,
  d2dcMonth = null,
  d2dcBaseAmount = 50
}) => {
  const transaction = await sequelize.transaction();

  try {
    const property = await Property.findByPk(propertyId, { transaction });
    if (!property) {
      throw new Error('Property not found');
    }
    if (property.isActive === false) {
      throw new Error(`Cannot generate assessment for inactive property ${property.propertyNumber || propertyId}. Property must be active to receive assessments.`);
    }
    if (!financialYear || !/^\d{4}-\d{2}$/.test(financialYear)) {
      throw new Error('Invalid financial year format. Expected format: YYYY-YY (e.g., 2024-25)');
    }

    // Validate D2DC month if D2DC is requested
    if (includeD2DCDemand && !d2dcMonth) {
      throw new Error('d2dcMonth is required when includeD2DCDemand is true (format: YYYY-MM)');
    }

    const results = {
      propertyId,
      assessmentYear,
      financialYear,
      propertyAssessment: null,
      waterAssessments: [],
      unifiedDemand: null,
      demandItems: [],
      shopDemands: [], // Separate demand records for shops
      d2dcDemand: null, // Separate demand record for D2DC
      created: {
        propertyAssessment: false,
        waterAssessments: [],
        demand: false,
        shopDemands: [],
        d2dcDemand: false
      },
      errors: []
    };

    // Step 1: Call Property demand generation logic (assessment + amounts)
    let propertyTaxBaseAmount = 0;
    let propertyTaxArrears = 0;
    try {
      const propertyData = await getPropertyDemandData(
        propertyId,
        assessmentYear,
        financialYear,
        assessorId,
        defaultTaxRate,
        transaction
      );
      results.propertyAssessment = propertyData.assessment;
      results.created.propertyAssessment = propertyData.created;
      propertyTaxBaseAmount = propertyData.baseAmount;
      propertyTaxArrears = propertyData.arrearsAmount;
    } catch (error) {
      results.errors.push({ type: 'PROPERTY_ASSESSMENT', message: error.message });
    }

    // Step 2: Call Water demand generation logic (assessments + amounts per connection)
    let waterItemsData = [];
    let waterTaxBaseAmount = 0;
    let waterTaxArrears = 0;
    try {
      const { waterAssessments: waterDataList } = await getWaterDemandData(
        propertyId,
        assessmentYear,
        financialYear,
        assessorId,
        transaction
      );
      results.waterAssessments = waterDataList.map((w) => w.assessment);
      results.created.waterAssessments = waterDataList.map((w) => ({ created: w.created }));
      waterItemsData = waterDataList.map((w) => ({ assessment: w.assessment, baseAmount: w.baseAmount, arrearsAmount: w.arrearsAmount }));
      waterItemsData.forEach((w) => {
        waterTaxBaseAmount += w.baseAmount;
        waterTaxArrears += w.arrearsAmount;
      });
    } catch (error) {
      results.errors.push({ type: 'WATER_ASSESSMENT', message: error.message });
    }

    // Step 3: Check if unified demand already exists (idempotency)
    const existingDemand = await Demand.findOne({
      where: {
        propertyId,
        financialYear,
        serviceType: 'HOUSE_TAX', // Use HOUSE_TAX as base, but store both assessments
        remarks: {
          [Op.like]: `%UNIFIED_DEMAND%`
        }
      },
      transaction
    });

    if (existingDemand) {
      await transaction.rollback();
      return {
        ...results,
        unifiedDemand: existingDemand,
        message: 'Unified demand already exists for this property and financial year'
      };
    }

    // Step 4: Validate that we have at least one assessment
    if (!results.propertyAssessment && results.waterAssessments.length === 0) {
      await transaction.rollback();
      throw new Error('No assessments could be generated. Property may not have active water connections or assessment data is missing.');
    }

    // Compute totals before penalty calc (used as penalty base)
    const totalBaseAmount = propertyTaxBaseAmount + waterTaxBaseAmount;
    const totalArrears = propertyTaxArrears + waterTaxArrears;

    // Step 7: Calculate penalty/interest (Option A: stored at Demand level only)
    // If dueDate is already in the past at creation, apply penalty immediately.
    // Otherwise keep 0 and let cron apply when it becomes overdue.
    const effectiveDueDate = dueDate ? new Date(dueDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let penaltyAmount = 0;
    let interestAmount = 0;
    let overdueDays = 0;
    let lastPenaltyAppliedAt = null;
    let penaltyBreakdown = null;

    if (effectiveDueDate < today) {
      const rule = await getActivePenaltyRule(financialYear);
      if (rule) {
        // Build a provisional demand object for calculation (not saved yet)
        const provisionalTotal = Math.round((totalBaseAmount + totalArrears) * 100) / 100;
        const provisionalDemand = {
          baseAmount: totalBaseAmount,
          arrearsAmount: totalArrears,
          paidAmount: 0,
          balanceAmount: provisionalTotal,
          penaltyAmount: 0,
          interestAmount: 0,
          status: 'pending',
          dueDate: effectiveDueDate,
          lastPenaltyAppliedAt: null
        };

        overdueDays = calculateOverdueDays(effectiveDueDate, rule.gracePeriodDays);
        if (shouldApplyPenalty(provisionalDemand, rule, overdueDays)) {
          penaltyAmount = calculatePenalty(provisionalDemand, rule, overdueDays);
          interestAmount = calculateInterest(provisionalDemand, rule, overdueDays);
          lastPenaltyAppliedAt = new Date();
          penaltyBreakdown = [
            {
              date: lastPenaltyAppliedAt.toISOString(),
              overdueDays,
              penalty: penaltyAmount,
              interest: interestAmount,
              totalPenalty: penaltyAmount,
              totalInterest: interestAmount,
              reason: `Applied at creation (due date already passed). Rule: ${rule.ruleName}`
            }
          ];
        }
      }
    }

    // Step 8: Create unified demand with proper serviceType
    // Determine serviceType based on what assessments exist
    let demandServiceType = 'HOUSE_TAX';
    if (!results.propertyAssessment && results.waterAssessments.length > 0) {
      // Only water tax exists
      demandServiceType = 'WATER_TAX';
    } else if (results.propertyAssessment && results.waterAssessments.length > 0) {
      // Both exist - use HOUSE_TAX as base (unified)
      demandServiceType = 'HOUSE_TAX';
    }

    const totalAmount = Math.round((totalBaseAmount + totalArrears + penaltyAmount + interestAmount) * 100) / 100;

    // Generate demand number
    const demandNumber = `UD-${financialYear}-${Date.now()}-${propertyId}`;

    // Store assessment IDs in remarks as JSON for reference
    // IMPORTANT: Set remarks BEFORE creating demand so validation hook can detect unified demand
    const demandRemarks = JSON.stringify({
      type: 'UNIFIED_DEMAND',
      propertyAssessmentId: results.propertyAssessment?.id || null,
      waterAssessmentIds: results.waterAssessments.map(a => a.id),
      breakdown: {
        propertyTax: {
          baseAmount: propertyTaxBaseAmount,
          arrears: propertyTaxArrears,
          hasAssessment: !!results.propertyAssessment
        },
        waterTax: {
          baseAmount: waterTaxBaseAmount,
          arrears: waterTaxArrears,
          connectionCount: results.waterAssessments.length,
          connections: results.waterAssessments.map(a => ({
            assessmentId: a.id,
            connectionId: a.waterConnectionId,
            amount: calculateWaterTaxAmount(a.assessmentType, a.rate)
          }))
        },
        total: {
          baseAmount: totalBaseAmount,
          arrears: totalArrears,
          penalty: penaltyAmount,
          interest: interestAmount,
          total: totalAmount
        }
      },
      customRemarks: remarks
    });

    // Create unified demand
    // For unified demands: if only water tax exists, use WATER_TAX serviceType
    // If property tax exists (with or without water), use HOUSE_TAX serviceType
    // The validation hook will check remarks to allow unified demands
    const unifiedDemand = await Demand.create({
      demandNumber,
      propertyId,
      assessmentId: results.propertyAssessment?.id || null, // Only set if property assessment exists
      waterTaxAssessmentId: results.waterAssessments[0]?.id || null,
      serviceType: demandServiceType,
      financialYear,
      baseAmount: totalBaseAmount,
      arrearsAmount: totalArrears,
      penaltyAmount,
      interestAmount,
      totalAmount,
      balanceAmount: totalAmount,
      paidAmount: 0,
      dueDate: effectiveDueDate,
      status: (overdueDays > 0 ? 'overdue' : 'pending'),
      generatedBy: assessorId,
      remarks: demandRemarks, // Set remarks so validation hook can detect unified demand
      // If penalty applied at creation, persist bookkeeping to avoid duplicate application
      overdueDays: overdueDays > 0 ? overdueDays : 0,
      lastPenaltyAppliedAt,
      penaltyBreakdown
    }, { transaction });

    // Step 9: Create demand items for detailed breakdown
    const demandItems = [];

    // Create Property Tax demand item
    if (results.propertyAssessment && propertyTaxBaseAmount > 0) {
      const propertyItemTotal = Math.round((propertyTaxBaseAmount + propertyTaxArrears) * 100) / 100;
      const propertyItem = await DemandItem.create({
        demandId: unifiedDemand.id,
        taxType: 'PROPERTY',
        referenceId: results.propertyAssessment.id,
        connectionId: null,
        baseAmount: propertyTaxBaseAmount,
        arrearsAmount: propertyTaxArrears,
        penaltyAmount: 0,
        interestAmount: 0,
        totalAmount: propertyItemTotal,
        description: `Property Tax - Assessment ${results.propertyAssessment.assessmentNumber}`,
        metadata: {
          assessmentId: results.propertyAssessment.id,
          assessmentNumber: results.propertyAssessment.assessmentNumber,
          assessedValue: results.propertyAssessment.assessedValue,
          taxRate: results.propertyAssessment.taxRate
        }
      }, { transaction });
      demandItems.push(propertyItem);
    }

    // Pre-fetch all water connections to avoid N+1 queries
    const waterConnectionIds = results.waterAssessments.map(assessment => assessment.waterConnectionId);
    const connectionDetails = await WaterConnection.findAll({
      where: {
        id: { [Op.in]: waterConnectionIds }
      },
      transaction
    });

    // Create in-memory map for O(1) lookup
    const connectionMap = new Map();
    connectionDetails.forEach(connection => {
      connectionMap.set(connection.id, connection);
    });

    // Create Water Tax demand items (one per connection) from orchestrated water data
    for (const w of waterItemsData) {
      const waterAssessment = w.assessment;
      const waterItemBaseAmount = w.baseAmount;
      const waterItemArrears = w.arrearsAmount;
      const waterItemTotal = Math.round((waterItemBaseAmount + waterItemArrears) * 100) / 100;

      const connection = connectionMap.get(waterAssessment.waterConnectionId);

      const waterItem = await DemandItem.create({
        demandId: unifiedDemand.id,
        taxType: 'WATER',
        referenceId: waterAssessment.id,
        connectionId: waterAssessment.waterConnectionId,
        baseAmount: waterItemBaseAmount,
        arrearsAmount: waterItemArrears,
        penaltyAmount: 0,
        interestAmount: 0,
        totalAmount: waterItemTotal,
        description: `Water Tax - Connection ${connection?.connectionNumber || waterAssessment.waterConnectionId} (${waterAssessment.assessmentType})`,
        metadata: {
          assessmentId: waterAssessment.id,
          assessmentNumber: waterAssessment.assessmentNumber,
          connectionId: waterAssessment.waterConnectionId,
          connectionNumber: connection?.connectionNumber || null,
          connectionType: connection?.connectionType || null,
          isMetered: connection?.isMetered || false,
          assessmentType: waterAssessment.assessmentType,
          rate: waterAssessment.rate
        }
      }, { transaction });
      demandItems.push(waterItem);
    }

    results.unifiedDemand = unifiedDemand;
    results.demandItems = demandItems;
    results.created.demand = true;

    // Step 10: Optionally generate Shop demands (separate Demand records)
    if (includeShopDemands) {
      try {
        const shopDemandsList = await generateShopDemandsForProperty(
          propertyId,
          financialYear,
          assessorId,
          dueDate,
          transaction
        );
        results.shopDemands = shopDemandsList.map((sd) => sd.demand);
        results.created.shopDemands = shopDemandsList.map((sd) => sd.created);
      } catch (error) {
        results.errors.push({ type: 'SHOP_DEMANDS', message: error.message });
      }
    }

    // Step 11: Optionally generate D2DC demand (separate Demand record)
    if (includeD2DCDemand && d2dcMonth) {
      try {
        const d2dcResult = await generateD2DCDemandForProperty(
          propertyId,
          d2dcMonth,
          assessorId,
          d2dcBaseAmount,
          dueDate,
          remarks ? `D2DC: ${remarks}` : null,
          transaction
        );
        results.d2dcDemand = d2dcResult.demand;
        results.created.d2dcDemand = d2dcResult.created;
      } catch (error) {
        results.errors.push({ type: 'D2DC_DEMAND', message: error.message });
      }
    }

    await transaction.commit();

    // Fetch full demand details with associations
    const demandWithDetails = await Demand.findByPk(unifiedDemand.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false },
        { model: WaterTaxAssessment, as: 'waterTaxAssessment', required: false },
        {
          model: DemandItem,
          as: 'items',
          include: [
            { model: WaterConnection, as: 'waterConnection', required: false }
          ]
        }
      ]
    });

    results.unifiedDemand = demandWithDetails;

    // Fetch shop demands with associations if generated
    if (results.shopDemands.length > 0) {
      const shopDemandIds = results.shopDemands.map((d) => d.id);
      const shopDemandsWithDetails = await Demand.findAll({
        where: { id: { [Op.in]: shopDemandIds } },
        include: [
          { model: Property, as: 'property', include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
          { model: ShopTaxAssessment, as: 'shopTaxAssessment', required: false, include: [{ model: Shop, as: 'shop' }] }
        ]
      });
      results.shopDemands = shopDemandsWithDetails;
    }

    // Fetch D2DC demand with associations if generated
    if (results.d2dcDemand) {
      const d2dcWithDetails = await Demand.findByPk(results.d2dcDemand.id, {
        include: [
          { model: Property, as: 'property', include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }] }
        ]
      });
      results.d2dcDemand = d2dcWithDetails;
    }

    return results;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get unified demand breakdown
 */
export const getUnifiedDemandBreakdown = async (demandId) => {
  const demand = await Demand.findByPk(demandId, {
    include: [
      {
        model: Property,
        as: 'property',
        include: [
          { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
          { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
          {
            model: WaterConnection,
            as: 'waterConnections',
            where: { status: 'ACTIVE' },
            required: false
          }
        ]
      },
      { model: Assessment, as: 'assessment', required: false },
      { model: WaterTaxAssessment, as: 'waterTaxAssessment', required: false },
      {
        model: DemandItem,
        as: 'items',
        include: [
          { model: WaterConnection, as: 'waterConnection', required: false }
        ],
        order: [['taxType', 'ASC'], ['id', 'ASC']]
      }
    ]
  });

  if (!demand) {
    throw new Error('Demand not found');
  }

  // Determine unified demand (and avoid using stored remarks breakdown, which can get stale)
  const remarksString = typeof demand.remarks === 'string' ? demand.remarks : '';
  const isUnified =
    (remarksString && remarksString.includes('UNIFIED_DEMAND')) ||
    (Array.isArray(demand.items) && demand.items.length > 0);

  // Always compute a LIVE breakdown from demand items + demand-level penalty/interest.
  // Option A: penalty/interest are stored ONLY at Demand level (not distributed to items).
  let breakdown = null;
  if (isUnified) {
    const items = Array.isArray(demand.items) ? demand.items : [];
    const propertyItems = items.filter((item) => item.taxType === 'PROPERTY');
    const waterItems = items.filter((item) => item.taxType === 'WATER');

    const propertyBase = propertyItems.reduce((sum, item) => sum + parseFloat(item.baseAmount || 0), 0);
    const propertyArrears = propertyItems.reduce((sum, item) => sum + parseFloat(item.arrearsAmount || 0), 0);
    const waterBase = waterItems.reduce((sum, item) => sum + parseFloat(item.baseAmount || 0), 0);
    const waterArrears = waterItems.reduce((sum, item) => sum + parseFloat(item.arrearsAmount || 0), 0);

    const itemsBaseTotal = Math.round((propertyBase + waterBase) * 100) / 100;
    const itemsArrearsTotal = Math.round((propertyArrears + waterArrears) * 100) / 100;
    const itemsSubtotal = Math.round((itemsBaseTotal + itemsArrearsTotal) * 100) / 100;

    const demandBaseTotal = parseFloat(demand.baseAmount || 0);
    const demandArrearsTotal = parseFloat(demand.arrearsAmount || 0);
    const demandPenalty = parseFloat(demand.penaltyAmount || 0);
    const demandInterest = parseFloat(demand.interestAmount || 0);
    const demandTotal = parseFloat(demand.totalAmount || 0);

    breakdown = {
      penaltyModel: 'DEMAND_LEVEL',
      note: 'Penalty/interest are applied on the total demand (demand-level), not per item.',
      propertyTax: {
        baseAmount: Math.round(propertyBase * 100) / 100,
        arrearsAmount: Math.round(propertyArrears * 100) / 100,
        subtotalAmount: Math.round((propertyBase + propertyArrears) * 100) / 100,
        hasAssessment: propertyItems.length > 0
      },
      waterTax: {
        baseAmount: Math.round(waterBase * 100) / 100,
        arrearsAmount: Math.round(waterArrears * 100) / 100,
        subtotalAmount: Math.round((waterBase + waterArrears) * 100) / 100,
        connectionCount: waterItems.length,
        connections: waterItems.map((item) => ({
          assessmentId: item.referenceId,
          connectionId: item.connectionId,
          connectionNumber: item.metadata?.connectionNumber || null,
          amount: parseFloat(item.baseAmount || 0)
        }))
      },
      totals: {
        // Demand-level (source of truth)
        baseAmount: Math.round(demandBaseTotal * 100) / 100,
        arrearsAmount: Math.round(demandArrearsTotal * 100) / 100,
        penaltyAmount: Math.round(demandPenalty * 100) / 100,
        interestAmount: Math.round(demandInterest * 100) / 100,
        totalAmount: Math.round(demandTotal * 100) / 100,

        // Item subtotals (for UI reconciliation)
        itemsBaseAmount: itemsBaseTotal,
        itemsArrearsAmount: itemsArrearsTotal,
        itemsSubtotalAmount: itemsSubtotal,
        expectedTotalAmount: Math.round((itemsSubtotal + demandPenalty + demandInterest) * 100) / 100,
        differenceAmount: Math.round((demandTotal - (itemsSubtotal + demandPenalty + demandInterest)) * 100) / 100
      }
    };
  }

  return {
    demand,
    isUnified,
    breakdown,
    items: demand.items || []
  };
};

/**
 * Get unified tax summary for a property
 * @param {number} propertyId - Property ID
 * @param {number} assessmentYear - Assessment year (optional)
 * @returns {Promise<Object>} Unified summary with assessments and demand
 */
export const getUnifiedTaxSummary = async (propertyId, assessmentYear = null) => {
  const property = await Property.findByPk(propertyId, {
    include: [
      { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
      { model: Ward, as: 'ward', attributes: ['id', 'wardNumber', 'wardName'] },
      {
        model: WaterConnection,
        as: 'waterConnections',
        where: { status: 'ACTIVE' },
        required: false
      }
    ]
  });

  if (!property) {
    throw new Error('Property not found');
  }

  // Get property tax assessment
  const propertyAssessmentWhere = { propertyId };
  if (assessmentYear) {
    propertyAssessmentWhere.assessmentYear = assessmentYear;
  }
  const propertyAssessment = await Assessment.findOne({
    where: propertyAssessmentWhere,
    order: [['assessmentYear', 'DESC'], ['createdAt', 'DESC']],
    include: [
      { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] },
      { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
    ]
  });

  // Get water tax assessments
  const waterAssessmentWhere = { propertyId };
  if (assessmentYear) {
    waterAssessmentWhere.assessmentYear = assessmentYear;
  }
  const waterAssessments = await WaterTaxAssessment.findAll({
    where: waterAssessmentWhere,
    include: [
      { model: WaterConnection, as: 'waterConnection' },
      { model: User, as: 'assessor', attributes: ['id', 'firstName', 'lastName'] },
      { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
    ],
    order: [['assessmentYear', 'DESC'], ['createdAt', 'DESC']]
  });

  // Get unified demand (if exists)
  const unifiedDemand = await Demand.findOne({
    where: {
      propertyId,
      remarks: {
        [Op.like]: `%UNIFIED_DEMAND%`
      }
    },
    include: [
      {
        model: DemandItem,
        as: 'items',
        include: [
          { model: WaterConnection, as: 'waterConnection', required: false }
        ]
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  return {
    property,
    propertyAssessment,
    waterAssessments,
    unifiedDemand,
    summary: {
      hasPropertyTax: !!propertyAssessment,
      hasWaterTax: waterAssessments.length > 0,
      waterConnectionCount: property.waterConnections?.length || 0,
      hasUnifiedDemand: !!unifiedDemand
    }
  };
};

// Re-export for backward compatibility (used by report controller or other callers)
export { computeWaterArrearsPerConnection as calculateWaterArrearsPerConnection } from './waterDemandService.js';
