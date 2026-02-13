import { Demand, Assessment, Property, Payment, User, Ward, WaterTaxAssessment, WaterConnection, DemandItem, D2DCRecord, Shop, ShopTaxAssessment, AdminManagement } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { auditLogger } from '../utils/auditLogger.js';
import { generateUnifiedTaxAssessmentAndDemand, getUnifiedDemandBreakdown, getUnifiedTaxSummary as getUnifiedTaxSummaryService } from '../services/unifiedTaxService.js';

/**
 * @route   GET /api/demands
 * @desc    Get all tax demands (with filters)
 * @access  Private
 */
export const getAllDemands = async (req, res, next) => {
  try {
    const {
      propertyId,
      financialYear,
      status,
      serviceType, // Filter by service type (HOUSE_TAX or D2DC)
      search,
      minAmount,
      maxAmount,
      overdue,
      remarks, // Filter by remarks (for unified demands)
      collectorId, // Filter by collector's assigned wards
      wardId, // Filter by ward
      dueDate, // Filter by due date
      page = 1,
      limit = 10
    } = req.query;

    const where = {};
    const whereConditions = []; // For combining conditions

    if (propertyId) where.propertyId = propertyId;
    if (financialYear) where.financialYear = financialYear;
    if (status) where.status = status;
    if (serviceType) where.serviceType = serviceType; // Filter by service type
    if (wardId) where.wardId = wardId;
    if (dueDate) where.dueDate = dueDate;

    // Filter by remarks (for unified demands)
    if (remarks) {
      where.remarks = { [Op.iLike]: `%${remarks}%` };
    }

    // Search by demand number
    if (search) {
      where.demandNumber = { [Op.iLike]: `%${search}%` };
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount) where.totalAmount[Op.gte] = parseFloat(minAmount);
      if (maxAmount) where.totalAmount[Op.lte] = parseFloat(maxAmount);
    }

    // Filter overdue demands
    if (overdue === 'true') {
      where.status = { [Op.in]: ['overdue', 'pending'] };
      where.dueDate = { [Op.lt]: new Date() };
      where.balanceAmount = { [Op.gt]: 0 };
    }

    // For citizens, show only demands of their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    // For collectors, show only demands from their assigned wards
    if (req.user.role === 'collector' || req.user.role === 'tax_collector') {
      // Get collector's assigned wards
      const collectorWards = await Ward.findAll({
        where: {
          collectorId: req.user.staff_id || req.user.id
        },
        attributes: ['id']
      });

      if (collectorWards.length === 0) {
        // If collector has no assigned wards, return empty result
        return res.json({
          success: true,
          data: {
            demands: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }

      const wardIds = collectorWards.map(w => w.id);
      where['$property.wardId$'] = { [Op.in]: wardIds };
    }

    // For clerks, show only demands from their assigned wards
    if (req.user.role === 'clerk') {
      // Get clerk's ward_ids from multiple sources
      let clerkWardIds = req.user.ward_ids || req.user.dataValues?.ward_ids;
      
      // Fallback: If not in JWT, fetch from database
      if (!clerkWardIds || (Array.isArray(clerkWardIds) && clerkWardIds.length === 0)) {
        try {
          const clerkRecord = await AdminManagement.findByPk(req.user.id, {
            attributes: ['id', 'ward_ids']
          });
          if (clerkRecord && clerkRecord.ward_ids) {
            clerkWardIds = clerkRecord.ward_ids;
          } else {
            // Also check Ward table for clerkId assignment
            const assignedWards = await Ward.findAll({
              where: { clerkId: req.user.id, isActive: true },
              attributes: ['id']
            });
            if (assignedWards.length > 0) {
              clerkWardIds = assignedWards.map(w => w.id);
            }
          }
        } catch (dbError) {
          console.error(`[getAllDemands] Error fetching clerk wards:`, dbError.message);
        }
      }
      
      // Also check req.wardFilter (set by requireWardAccess middleware)
      if (req.wardFilter && req.wardFilter.id) {
        const wardFilterIds = req.wardFilter.id[Op.in] || req.wardFilter.id;
        const wardFilterArray = Array.isArray(wardFilterIds) ? wardFilterIds : [wardFilterIds];
        clerkWardIds = clerkWardIds || wardFilterArray;
        // Use intersection if both exist
        if (clerkWardIds && Array.isArray(clerkWardIds) && Array.isArray(wardFilterArray)) {
          clerkWardIds = clerkWardIds.filter(id => wardFilterArray.includes(id));
        }
      }
      
      if (clerkWardIds && (Array.isArray(clerkWardIds) ? clerkWardIds.length > 0 : clerkWardIds)) {
        const wardIdsArray = Array.isArray(clerkWardIds) ? clerkWardIds : [clerkWardIds];
        const wardIdsNum = wardIdsArray.map(id => parseInt(id)).filter(id => !isNaN(id));
        
        console.log(`[getAllDemands] Clerk ${req.user.id} filtering demands by wards: [${wardIdsNum.join(', ')}]`);
        
        // Build ward filter condition
        // For SHOP_TAX: filter by shop's wardId
        // For other types: filter by property's wardId
        const wardFilter = {
          [Op.or]: [
            // Property-based demands (HOUSE_TAX, WATER_TAX, D2DC)
            { '$property.wardId$': { [Op.in]: wardIdsNum } },
            // SHOP_TAX demands (ward comes from shop)
            { '$shopTaxAssessment.shop.wardId$': { [Op.in]: wardIdsNum } }
          ]
        };
        
        // Add ward filter to whereConditions array
        whereConditions.push(wardFilter);
      } else {
        // Clerk has no assigned wards - return empty result
        console.log(`[getAllDemands] Clerk ${req.user.id} has no assigned wards, returning empty result`);
        return res.json({
          success: true,
          data: {
            demands: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: 0
            }
          }
        });
      }
    }

    // Combine all where conditions
    if (whereConditions.length > 0) {
      if (Object.keys(where).length > 0) {
        where[Op.and] = [
          ...(where[Op.and] || []),
          ...whereConditions
        ];
      } else {
        Object.assign(where, whereConditions[0]);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Demand.findAndCountAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false }, // Optional for D2DC and WATER_TAX
        {
          model: WaterTaxAssessment,
          as: 'waterTaxAssessment',
          required: false,
          include: [
            { model: WaterConnection, as: 'waterConnection', attributes: ['id', 'connectionNumber'] }
          ]
        },
        {
          model: ShopTaxAssessment,
          as: 'shopTaxAssessment',
          required: false,
          include: [{ model: Shop, as: 'shop', attributes: ['id', 'shopNumber', 'shopName', 'propertyId', 'wardId', 'status'] }]
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        demands: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/demands/:id
 * @desc    Get demand by ID
 * @access  Private
 */
export const getDemandById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    console.log(`[getDemandById] Request for demand ${id} by ${userRole} (userId: ${userId})`);

    const demand = await Demand.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property',
          required: false, // Make property optional to handle edge cases (SHOP_TAX might have property via shop)
          include: [
            { model: User, as: 'owner', attributes: { exclude: ['password'] }, required: false },
            { model: Ward, as: 'ward', required: false },
            {
              model: WaterConnection,
              as: 'waterConnections',
              where: { status: 'ACTIVE' },
              required: false
            }
          ]
        },
        { model: Assessment, as: 'assessment', required: false }, // Optional for D2DC and WATER_TAX
        { model: WaterTaxAssessment, as: 'waterTaxAssessment', required: false }, // Optional for HOUSE_TAX and D2DC
        {
          model: ShopTaxAssessment,
          as: 'shopTaxAssessment',
          required: false,
          include: [{ model: Shop, as: 'shop', attributes: ['id', 'shopNumber', 'shopName', 'propertyId', 'wardId', 'status'] }]
        },
        {
          model: DemandItem,
          as: 'items',
          include: [
            { model: WaterConnection, as: 'waterConnection', required: false }
          ],
          order: [['taxType', 'ASC'], ['id', 'ASC']]
        },
        {
          model: Payment,
          as: 'payments',
          include: [
            { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
      ]
    });

    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    // Check access for citizens
    if (req.user.role === 'citizen') {
      const property = await Property.findByPk(demand.propertyId);
      if (property.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Check access for clerks - must be from assigned wards
    if (req.user.role === 'clerk') {
      // Get ward_ids from multiple possible locations
      let allowedWardIds = req.user.ward_ids || req.user.dataValues?.ward_ids;
      
      console.log(`[getDemandById] Clerk ${req.user.id} - ward_ids from req.user.ward_ids:`, req.user.ward_ids);
      console.log(`[getDemandById] Clerk ${req.user.id} - ward_ids from req.user.dataValues:`, req.user.dataValues?.ward_ids);
      
      // Fallback: If ward_ids not in JWT, fetch from database
      if (!allowedWardIds || (Array.isArray(allowedWardIds) && allowedWardIds.length === 0)) {
        console.log(`[getDemandById] Clerk ${req.user.id} - ward_ids not in JWT, fetching from database...`);
        try {
          const clerkRecord = await AdminManagement.findByPk(req.user.id, {
            attributes: ['id', 'ward_ids']
          });
          if (clerkRecord && clerkRecord.ward_ids) {
            allowedWardIds = clerkRecord.ward_ids;
            console.log(`[getDemandById] Clerk ${req.user.id} - fetched ward_ids from DB:`, allowedWardIds);
          } else {
            // Also check Ward table for clerkId assignment
            const assignedWards = await Ward.findAll({
              where: { clerkId: req.user.id, isActive: true },
              attributes: ['id']
            });
            if (assignedWards.length > 0) {
              allowedWardIds = assignedWards.map(w => w.id);
              console.log(`[getDemandById] Clerk ${req.user.id} - found wards via clerkId:`, allowedWardIds);
            }
          }
        } catch (dbError) {
          console.error(`[getDemandById] Error fetching clerk wards from DB:`, dbError.message);
        }
      }
      
      console.log(`[getDemandById] Clerk ${req.user.id} - final allowedWardIds:`, allowedWardIds);
      
      if (allowedWardIds && (Array.isArray(allowedWardIds) ? allowedWardIds.length > 0 : allowedWardIds)) {
        // Normalize to array
        const wardIdsArray = Array.isArray(allowedWardIds) ? allowedWardIds : [allowedWardIds];
        
        // Get ward ID from property or shop
        let demandWardId = null;
        
        // For SHOP_TAX: get from shop's wardId first, then fallback to property
        if (demand.serviceType === 'SHOP_TAX' && demand.shopTaxAssessment?.shop) {
          demandWardId = demand.shopTaxAssessment.shop.wardId;
          console.log(`[getDemandById] SHOP_TAX demand ${id} - shop wardId: ${demandWardId}, shop:`, {
            id: demand.shopTaxAssessment.shop.id,
            shopNumber: demand.shopTaxAssessment.shop.shopNumber,
            wardId: demand.shopTaxAssessment.shop.wardId
          });
        }
        
        // Fallback to property wardId (for HOUSE_TAX, WATER_TAX, D2DC, or if shop wardId not available)
        if (!demandWardId && demand.property) {
          demandWardId = demand.property.wardId;
          console.log(`[getDemandById] Using property wardId: ${demandWardId}, propertyId: ${demand.property.id}`);
        }
        
        // For WATER_TAX: also check waterTaxAssessment's property
        if (!demandWardId && demand.waterTaxAssessment?.property) {
          demandWardId = demand.waterTaxAssessment.property.wardId;
          console.log(`[getDemandById] Using waterTaxAssessment property wardId: ${demandWardId}`);
        }
        
        // If we can't determine ward, deny access (safer than allowing)
        if (!demandWardId) {
          console.error(`[getDemandById] Clerk ${req.user.id} - Cannot determine ward for demand ${id}`);
          console.error(`  - serviceType: ${demand.serviceType}`);
          console.error(`  - property exists: ${!!demand.property}, propertyId: ${demand.propertyId}`);
          console.error(`  - shopTaxAssessment exists: ${!!demand.shopTaxAssessment}`);
          console.error(`  - shop exists: ${!!demand.shopTaxAssessment?.shop}`);
          return res.status(403).json({ 
            success: false, 
            message: 'Access denied: Unable to verify ward access' 
          });
        }
        
        // Normalize ward IDs to numbers for comparison (handle null/undefined)
        const demandWardIdNum = demandWardId ? parseInt(demandWardId) : null;
        const wardIdsArrayNum = wardIdsArray
          .map(id => id ? parseInt(id) : null)
          .filter(id => id !== null && !isNaN(id));
        
        console.log(`[getDemandById] Comparing - demand ward: ${demandWardIdNum} (type: ${typeof demandWardIdNum})`);
        console.log(`[getDemandById] Comparing - clerk wards: [${wardIdsArrayNum.join(', ')}] (types: [${wardIdsArrayNum.map(id => typeof id).join(', ')}])`);
        
        // Check if demand's ward is in clerk's assigned wards
        if (demandWardIdNum === null || isNaN(demandWardIdNum) || !wardIdsArrayNum.includes(demandWardIdNum)) {
          console.log(`[getDemandById] ❌ Clerk ${req.user.id} denied access to demand ${id}`);
          console.log(`  - Demand ward: ${demandWardIdNum}`);
          console.log(`  - Clerk wards: [${wardIdsArrayNum.join(', ')}]`);
          console.log(`  - Match: ${wardIdsArrayNum.includes(demandWardIdNum)}`);
          return res.status(403).json({ 
            success: false, 
            message: `Access denied: Demand is in ward ${demandWardIdNum}, but you only have access to wards [${wardIdsArrayNum.join(', ')}]` 
          });
        }
        
        console.log(`[getDemandById] ✅ Ward check passed - demand ward ${demandWardIdNum} is in clerk's wards [${wardIdsArrayNum.join(', ')}]`);
      } else {
        // Clerk has no assigned wards - deny access
        console.error(`[getDemandById] Clerk ${req.user.id} has no assigned wards`);
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: No wards assigned to clerk. Please contact administrator.' 
        });
      }
    }

    console.log(`[getDemandById] Access granted for demand ${id} to ${userRole} (userId: ${userId})`);
    res.json({
      success: true,
      data: { demand }
    });
  } catch (error) {
    console.error(`[getDemandById] Error fetching demand ${id}:`, error.message);
    if (error.original) {
      console.error(`[getDemandById] Database error:`, error.original.message);
    }
    next(error);
  }
};

/**
 * @route   POST /api/demands
 * @desc    Generate tax demand from approved tax assessment (HOUSE_TAX) or D2DC demand
 * @access  Private (Admin, Assessor)
 */
export const createDemand = async (req, res, next) => {
  try {
    const {
      assessmentId,
      propertyId, // Required for D2DC
      serviceType = 'HOUSE_TAX', // Default to HOUSE_TAX for backward compatibility
      financialYear,
      dueDate,
      baseAmount, // Required for D2DC (monthly charge, e.g., ₹50)
      remarks
    } = req.body;

    // Validate serviceType
    if (!['HOUSE_TAX', 'D2DC', 'WATER_TAX'].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid serviceType. Must be HOUSE_TAX, D2DC, or WATER_TAX'
      });
    }

    let property;
    let assessment = null;

    if (serviceType === 'HOUSE_TAX') {
      // HOUSE_TAX requires assessment - CRITICAL VALIDATION
      if (!assessmentId) {
        return res.status(400).json({
          success: false,
          message: 'assessmentId is required for HOUSE_TAX demands. HOUSE_TAX demands must be generated from approved tax assessments.'
        });
      }

      // Ensure propertyId is not provided for HOUSE_TAX (it comes from assessment)
      if (propertyId) {
        return res.status(400).json({
          success: false,
          message: 'propertyId should not be provided for HOUSE_TAX demands. It is derived from the assessment.'
        });
      }

      assessment = await Assessment.findByPk(assessmentId, {
        include: [{ model: Property, as: 'property' }]
      });

      if (!assessment) {
        return res.status(404).json({
          success: false,
          message: 'Tax Assessment not found'
        });
      }

      // Check if assessment is approved
      if (assessment.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Can only generate demand from approved assessment'
        });
      }

      property = assessment.property;
    } else if (serviceType === 'WATER_TAX') {
      // WATER_TAX requires waterTaxAssessmentId
      const waterTaxAssessmentId = req.body.waterTaxAssessmentId || req.body.water_tax_assessment_id;

      if (!waterTaxAssessmentId) {
        return res.status(400).json({
          success: false,
          message: 'waterTaxAssessmentId is required for WATER_TAX demands'
        });
      }

      // Ensure assessmentId is NOT provided for WATER_TAX
      if (assessmentId) {
        return res.status(400).json({
          success: false,
          message: 'assessmentId should not be provided for WATER_TAX demands. Use waterTaxAssessmentId instead.'
        });
      }

      const waterTaxAssessment = await WaterTaxAssessment.findByPk(waterTaxAssessmentId, {
        include: [
          { model: Property, as: 'property' },
          { model: WaterConnection, as: 'waterConnection' }
        ]
      });

      if (!waterTaxAssessment) {
        return res.status(404).json({
          success: false,
          message: 'Water Tax Assessment not found'
        });
      }

      // Check if water tax assessment is approved
      if (waterTaxAssessment.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Can only generate demand from approved water tax assessment'
        });
      }

      property = waterTaxAssessment.property;
      assessment = null; // Not used for WATER_TAX
    } else {
      // D2DC doesn't require assessment - CRITICAL VALIDATION
      // Ensure assessmentId is NOT provided for D2DC
      if (assessmentId) {
        return res.status(400).json({
          success: false,
          message: 'assessmentId should not be provided for D2DC demands. D2DC is a municipal service linked directly to property, not assessment.'
        });
      }

      if (!propertyId) {
        return res.status(400).json({
          success: false,
          message: 'propertyId is required for D2DC demands'
        });
      }

      if (!baseAmount || baseAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'baseAmount is required for D2DC demands (e.g., 50 for ₹50/month)'
        });
      }

      property = await Property.findByPk(propertyId);
      if (!property) {
        return res.status(404).json({
          success: false,
          message: 'Property not found'
        });
      }
    }

    // Check if demand already exists for this property, serviceType, and period
    // For HOUSE_TAX: check by assessmentId + financialYear
    // For WATER_TAX: check by waterTaxAssessmentId + financialYear
    // For D2DC: check by propertyId + serviceType + month/year (using financialYear as period identifier)
    let existingDemandWhere;
    if (serviceType === 'HOUSE_TAX') {
      existingDemandWhere = { assessmentId, financialYear, serviceType };
    } else if (serviceType === 'WATER_TAX') {
      const waterTaxAssessmentId = req.body.waterTaxAssessmentId || req.body.water_tax_assessment_id;
      existingDemandWhere = { waterTaxAssessmentId, financialYear, serviceType };
    } else {
      existingDemandWhere = { propertyId: property.id, serviceType, financialYear };
    }

    const existingDemand = await Demand.findOne({
      where: existingDemandWhere
    });

    if (existingDemand) {
      return res.status(400).json({
        success: false,
        message: `Demand already exists for this ${serviceType === 'HOUSE_TAX' ? 'assessment and financial year' : serviceType === 'WATER_TAX' ? 'water tax assessment and financial year' : 'property and period'}`
      });
    }

    // Generate demand number
    const demandNumber = serviceType === 'D2DC'
      ? `D2DC-${financialYear}-${Date.now()}`
      : serviceType === 'WATER_TAX'
        ? `WTD-${financialYear}-${Date.now()}`
        : `DEM-${financialYear}-${Date.now()}`;

    // Calculate arrears from previous unpaid demands of the same serviceType
    const previousDemands = await Demand.findAll({
      where: {
        propertyId: property.id,
        serviceType: serviceType,
        financialYear: { [Op.ne]: financialYear },
        status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
      }
    });

    // Calculate arrears - ensure numeric conversion
    const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
      return sum + parseFloat(prevDemand.balanceAmount || 0);
    }, 0) * 100) / 100;

    // Calculate amounts
    let calculatedBaseAmount;
    let finalAssessmentId = null;
    let finalWaterTaxAssessmentId = null;

    if (serviceType === 'HOUSE_TAX') {
      calculatedBaseAmount = parseFloat(assessment.annualTaxAmount || 0);
      finalAssessmentId = assessmentId;
    } else if (serviceType === 'WATER_TAX') {
      const waterTaxAssessmentId = req.body.waterTaxAssessmentId || req.body.water_tax_assessment_id;
      const waterTaxAssessment = await WaterTaxAssessment.findByPk(waterTaxAssessmentId, {
        include: [{ model: WaterConnection, as: 'waterConnection' }]
      });

      if (!waterTaxAssessment) {
        return res.status(404).json({
          success: false,
          message: 'Water Tax Assessment not found'
        });
      }

      // Calculate base amount from water tax assessment
      // For METERED: rate is per unit, we'll use a default consumption or monthly estimate
      // For FIXED: rate is the fixed monthly amount
      if (waterTaxAssessment.assessmentType === 'FIXED') {
        calculatedBaseAmount = parseFloat(waterTaxAssessment.rate || 0) * 12; // Annual amount
      } else {
        // METERED: Use rate * estimated annual consumption (e.g., 1000 units/year default)
        // This should ideally come from actual meter readings, but for now use a default
        const estimatedAnnualConsumption = 1000; // Default, should be configurable
        calculatedBaseAmount = parseFloat(waterTaxAssessment.rate || 0) * estimatedAnnualConsumption;
      }
      finalWaterTaxAssessmentId = waterTaxAssessmentId;
    } else {
      // D2DC
      calculatedBaseAmount = parseFloat(baseAmount || 0);
    }

    const penaltyAmount = 0; // Can be calculated based on overdue logic
    const interestAmount = 0; // Can be calculated based on overdue logic
    const totalAmount = Math.round((calculatedBaseAmount + arrearsAmount + penaltyAmount + interestAmount) * 100) / 100;
    const balanceAmount = Math.round(totalAmount * 100) / 100;

    // Validation checks
    if (serviceType === 'D2DC' && finalAssessmentId !== null) {
      return res.status(400).json({
        success: false,
        message: 'D2DC demands cannot have an assessmentId. D2DC is a municipal service, not a tax assessment.'
      });
    }

    if (serviceType === 'HOUSE_TAX' && !finalAssessmentId) {
      return res.status(400).json({
        success: false,
        message: 'HOUSE_TAX demands require an assessmentId.'
      });
    }

    if (serviceType === 'WATER_TAX' && !finalWaterTaxAssessmentId) {
      return res.status(400).json({
        success: false,
        message: 'WATER_TAX demands require a waterTaxAssessmentId.'
      });
    }

    const demand = await Demand.create({
      demandNumber,
      propertyId: property.id,
      assessmentId: finalAssessmentId, // null for D2DC and WATER_TAX
      waterTaxAssessmentId: finalWaterTaxAssessmentId, // null for HOUSE_TAX and D2DC
      serviceType,
      financialYear,
      baseAmount: calculatedBaseAmount,
      arrearsAmount,
      penaltyAmount,
      interestAmount,
      totalAmount,
      balanceAmount: balanceAmount,
      paidAmount: 0,
      dueDate: new Date(dueDate),
      remarks
    });

    // If D2DC demand, create a D2DCRecord for audit
    if (serviceType === 'D2DC') {
      try {
        await D2DCRecord.create({
          type: 'DEMAND_GENERATION',
          collectorId: req.user.id,
          propertyId: property.id,
          wardId: property.wardId, // Assuming property has wardId
          demandId: demand.id,
          amount: demand.totalAmount,
          remarks: `Demand Created: ${demand.demandNumber}`
        });
      } catch (d2dcError) {
        console.error('Failed to create D2DC Record:', d2dcError);
        // Don't fail the request, just log error
      }
    }

    const createdDemand = await Demand.findByPk(demand.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false },
        { model: WaterTaxAssessment, as: 'waterTaxAssessment', required: false }
      ]
    });

    // Log demand creation with serviceType
    // Use 'Demand' as entityType for all demand types (D2DC is a serviceType, not a separate entity)
    await auditLogger.logCreate(
      req,
      req.user,
      'Demand',
      demand.id,
      {
        demandNumber: demand.demandNumber,
        propertyId: demand.propertyId,
        financialYear: demand.financialYear,
        totalAmount: demand.totalAmount,
        serviceType: demand.serviceType
      },
      `Created ${serviceType} demand: ${demand.demandNumber}`,
      { propertyId: demand.propertyId, assessmentId: demand.assessmentId, serviceType: demand.serviceType }
    );

    res.status(201).json({
      success: true,
      message: `${serviceType} demand generated successfully`,
      data: { demand: createdDemand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/generate-shop
 * @desc    Generate SHOP_TAX demand from approved shop tax assessment (idempotent: returns existing if already generated)
 * @access  Private (Admin, Assessor, Clerk)
 */
export const generateShopDemand = async (req, res, next) => {
  try {
    const { shopTaxAssessmentId, financialYear, dueDate, remarks } = req.body;

    if (!shopTaxAssessmentId) {
      return res.status(400).json({
        success: false,
        message: 'shopTaxAssessmentId is required'
      });
    }
    if (!financialYear) {
      return res.status(400).json({
        success: false,
        message: 'financialYear is required (e.g. 2024-25)'
      });
    }

    const shopTaxAssessment = await ShopTaxAssessment.findByPk(shopTaxAssessmentId, {
      include: [{ model: Shop, as: 'shop', include: [{ model: Property, as: 'property' }] }]
    });

    if (!shopTaxAssessment) {
      return res.status(404).json({
        success: false,
        message: 'Shop tax assessment not found'
      });
    }
    if (shopTaxAssessment.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only generate demand from approved shop tax assessment'
      });
    }

    const shop = shopTaxAssessment.shop;
    if (!shop) {
      return res.status(400).json({
        success: false,
        message: 'Shop not found for this assessment'
      });
    }

    // Shop closed validation: do not allow demand generation for closed shops
    if (shop.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate demand for a closed shop'
      });
    }

    const propertyId = shop.propertyId;
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Shop must be linked to a property'
      });
    }

    // Idempotency: if demand already exists for this shopTaxAssessmentId + financialYear, return existing
    const existingDemand = await Demand.findOne({
      where: {
        shopTaxAssessmentId,
        financialYear,
        serviceType: 'SHOP_TAX'
      }
    });

    if (existingDemand) {
      const existingWithInclude = await Demand.findByPk(existingDemand.id, {
        include: [
          { model: Property, as: 'property', include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
          { model: ShopTaxAssessment, as: 'shopTaxAssessment', required: false, include: [{ model: Shop, as: 'shop' }] }
        ]
      });
      return res.status(200).json({
        success: true,
        message: 'Demand already exists for this shop assessment and financial year (idempotent)',
        data: { demand: existingWithInclude, alreadyExisted: true }
      });
    }

    const dueDateResolved = dueDate ? new Date(dueDate) : new Date(`${financialYear.split('-')[1]}-03-31`);
    const baseAmount = parseFloat(shopTaxAssessment.annualTaxAmount || 0);
    const arrearsAmount = 0;
    const penaltyAmount = 0;
    const interestAmount = 0;
    const totalAmount = Math.round((baseAmount + arrearsAmount + penaltyAmount + interestAmount) * 100) / 100;
    const demandNumber = `STD-${financialYear}-${Date.now()}`;

    let demand;
    try {
      demand = await Demand.create({
        demandNumber,
        propertyId,
        assessmentId: null,
        waterTaxAssessmentId: null,
        shopTaxAssessmentId,
        serviceType: 'SHOP_TAX',
        financialYear,
        baseAmount,
        arrearsAmount,
        penaltyAmount,
        interestAmount,
        totalAmount,
        balanceAmount: totalAmount,
        paidAmount: 0,
        dueDate: dueDateResolved,
        status: 'pending',
        generatedBy: req.user.id,
        remarks: remarks || null
      });
    } catch (createError) {
      // Unique constraint violation (e.g. DB unique index on shopTaxAssessmentId + financialYear): return existing demand idempotently
      const isUniqueViolation =
        createError.name === 'SequelizeUniqueConstraintError' ||
        (createError.parent && createError.parent.code === '23505');
      if (isUniqueViolation) {
        const existing = await Demand.findOne({
          where: { shopTaxAssessmentId, financialYear, serviceType: 'SHOP_TAX' }
        });
        if (existing) {
          const existingWithInclude = await Demand.findByPk(existing.id, {
            include: [
              { model: Property, as: 'property', include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
              { model: ShopTaxAssessment, as: 'shopTaxAssessment', required: false, include: [{ model: Shop, as: 'shop' }] }
            ]
          });
          return res.status(200).json({
            success: true,
            message: 'Demand already exists for this shop assessment and financial year (idempotent)',
            data: { demand: existingWithInclude, alreadyExisted: true }
          });
        }
      }
      throw createError;
    }

    const createdDemand = await Demand.findByPk(demand.id, {
      include: [
        { model: Property, as: 'property', include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
        { model: ShopTaxAssessment, as: 'shopTaxAssessment', required: false, include: [{ model: Shop, as: 'shop' }] }
      ]
    });

    await auditLogger.logCreate(
      req,
      req.user,
      'Demand',
      demand.id,
      {
        demandNumber: demand.demandNumber,
        propertyId: demand.propertyId,
        shopTaxAssessmentId: demand.shopTaxAssessmentId,
        financialYear: demand.financialYear,
        totalAmount: demand.totalAmount,
        serviceType: 'SHOP_TAX'
      },
      `Created SHOP_TAX demand: ${demand.demandNumber}`,
      { propertyId: demand.propertyId, shopTaxAssessmentId: demand.shopTaxAssessmentId, serviceType: 'SHOP_TAX' }
    );

    res.status(201).json({
      success: true,
      message: 'Shop tax demand generated successfully',
      data: { demand: createdDemand, alreadyExisted: false }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/generate-combined
 * @desc    Generate combined demands (Property Tax + Water Tax) for a property
 * @access  Private (Admin, Assessor)
 */
export const generateCombinedDemands = async (req, res, next) => {
  try {
    const {
      propertyId,
      property_id,
      financialYear,
      financial_year,
      dueDate,
      due_date,
      remarks
    } = req.body;

    // Normalize to camelCase
    const normalizedPropertyId = propertyId || property_id;
    const normalizedFinancialYear = financialYear || financial_year;
    const normalizedDueDate = dueDate || due_date;

    // Validation
    if (!normalizedPropertyId) {
      return res.status(400).json({
        success: false,
        message: 'propertyId is required'
      });
    }

    if (!normalizedFinancialYear) {
      return res.status(400).json({
        success: false,
        message: 'financialYear is required'
      });
    }

    // Fetch property
    const property = await Property.findByPk(normalizedPropertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Fetch property tax assessment (if exists and approved)
    const propertyAssessment = await Assessment.findOne({
      where: {
        propertyId: normalizedPropertyId,
        status: 'approved'
      },
      include: [{ model: Property, as: 'property' }],
      order: [['createdAt', 'DESC']] // Get latest approved assessment
    });

    // Fetch water tax assessment (if exists and approved)
    // Get all water connections for the property first
    const waterConnections = await WaterConnection.findAll({
      where: {
        propertyId: normalizedPropertyId,
        status: 'ACTIVE'
      }
    });

    let waterTaxAssessment = null;
    if (waterConnections.length > 0) {
      // Get latest approved water tax assessment for any active connection
      waterTaxAssessment = await WaterTaxAssessment.findOne({
        where: {
          propertyId: normalizedPropertyId,
          status: 'approved'
        },
        include: [
          { model: Property, as: 'property' },
          { model: WaterConnection, as: 'waterConnection' }
        ],
        order: [['createdAt', 'DESC']] // Get latest approved assessment
      });
    }

    const createdDemands = [];
    const errors = [];

    // Generate Property Tax Demand (if assessment exists)
    if (propertyAssessment) {
      try {
        // Check if demand already exists
        const existingDemand = await Demand.findOne({
          where: {
            assessmentId: propertyAssessment.id,
            financialYear: normalizedFinancialYear,
            serviceType: 'HOUSE_TAX'
          }
        });

        if (existingDemand) {
          errors.push({
            type: 'HOUSE_TAX',
            message: 'Property tax demand already exists for this assessment and financial year'
          });
        } else {
          // Calculate arrears for property tax
          const previousDemands = await Demand.findAll({
            where: {
              propertyId: normalizedPropertyId,
              serviceType: 'HOUSE_TAX',
              financialYear: { [Op.ne]: normalizedFinancialYear },
              status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
            }
          });

          const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
            return sum + parseFloat(prevDemand.balanceAmount || 0);
          }, 0) * 100) / 100;

          const demandNumber = `DEM-${normalizedFinancialYear}-${Date.now()}-${propertyAssessment.id}`;
          const baseAmount = parseFloat(propertyAssessment.annualTaxAmount || 0);
          const totalAmount = Math.round((baseAmount + arrearsAmount) * 100) / 100;

          const demand = await Demand.create({
            demandNumber,
            propertyId: normalizedPropertyId,
            assessmentId: propertyAssessment.id,
            waterTaxAssessmentId: null,
            serviceType: 'HOUSE_TAX',
            financialYear: normalizedFinancialYear,
            baseAmount,
            arrearsAmount,
            penaltyAmount: 0,
            interestAmount: 0,
            totalAmount,
            balanceAmount: totalAmount,
            paidAmount: 0,
            dueDate: new Date(normalizedDueDate || new Date()),
            status: 'pending',
            generatedBy: req.user.id,
            remarks
          });

          createdDemands.push(demand);
        }
      } catch (error) {
        errors.push({
          type: 'HOUSE_TAX',
          message: error.message
        });
      }
    }

    // Generate Water Tax Demand (if assessment exists)
    if (waterTaxAssessment) {
      try {
        // Check if demand already exists
        const existingDemand = await Demand.findOne({
          where: {
            waterTaxAssessmentId: waterTaxAssessment.id,
            financialYear: normalizedFinancialYear,
            serviceType: 'WATER_TAX'
          }
        });

        if (existingDemand) {
          errors.push({
            type: 'WATER_TAX',
            message: 'Water tax demand already exists for this assessment and financial year'
          });
        } else {
          // Calculate arrears for water tax
          const previousDemands = await Demand.findAll({
            where: {
              propertyId: normalizedPropertyId,
              serviceType: 'WATER_TAX',
              financialYear: { [Op.ne]: normalizedFinancialYear },
              status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
            }
          });

          const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
            return sum + parseFloat(prevDemand.balanceAmount || 0);
          }, 0) * 100) / 100;

          // Calculate base amount from water tax assessment
          let baseAmount;
          if (waterTaxAssessment.assessmentType === 'FIXED') {
            baseAmount = parseFloat(waterTaxAssessment.rate || 0) * 12; // Annual amount
          } else {
            // METERED: Use rate * estimated annual consumption
            const estimatedAnnualConsumption = 1000; // Default, should be configurable
            baseAmount = parseFloat(waterTaxAssessment.rate || 0) * estimatedAnnualConsumption;
          }

          const totalAmount = Math.round((baseAmount + arrearsAmount) * 100) / 100;
          const demandNumber = `WTD-${normalizedFinancialYear}-${Date.now()}-${waterTaxAssessment.id}`;

          const demand = await Demand.create({
            demandNumber,
            propertyId: normalizedPropertyId,
            assessmentId: null,
            waterTaxAssessmentId: waterTaxAssessment.id,
            serviceType: 'WATER_TAX',
            financialYear: normalizedFinancialYear,
            baseAmount,
            arrearsAmount,
            penaltyAmount: 0,
            interestAmount: 0,
            totalAmount,
            balanceAmount: totalAmount,
            paidAmount: 0,
            dueDate: new Date(normalizedDueDate || new Date()),
            status: 'pending',
            generatedBy: req.user.id,
            remarks
          });

          createdDemands.push(demand);
        }
      } catch (error) {
        errors.push({
          type: 'WATER_TAX',
          message: error.message
        });
      }
    }

    // If no assessments found
    if (!propertyAssessment && !waterTaxAssessment) {
      return res.status(400).json({
        success: false,
        message: 'No approved assessments found for this property. Please create and approve assessments first.'
      });
    }

    // Fetch created demands with full details
    const demandsWithDetails = await Demand.findAll({
      where: {
        id: { [Op.in]: createdDemands.map(d => d.id) }
      },
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false },
        { model: WaterTaxAssessment, as: 'waterTaxAssessment', required: false }
      ]
    });

    // Calculate combined total
    const combinedTotal = demandsWithDetails.reduce((sum, d) => {
      return sum + parseFloat(d.totalAmount || 0);
    }, 0);

    res.status(201).json({
      success: true,
      message: `Generated ${createdDemands.length} demand(s)`,
      data: {
        demands: demandsWithDetails,
        combinedTotal: Math.round(combinedTotal * 100) / 100,
        created: createdDemands.length,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/d2dc
 * @desc    Generate D2DC (garbage collection) demand for a property
 * @access  Private (Admin)
 */
export const createD2DCDemand = async (req, res, next) => {
  try {
    const {
      propertyId,
      month, // e.g., "2024-01" for January 2024
      baseAmount = 50, // Default ₹50/month, configurable
      dueDate,
      remarks
    } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'propertyId is required'
      });
    }

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'month is required (format: YYYY-MM)'
      });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if D2DC demand already exists for this property and month
    const existingDemand = await Demand.findOne({
      where: {
        propertyId,
        serviceType: 'D2DC',
        financialYear: month // Using financialYear field to store month/year for D2DC
      }
    });

    if (existingDemand) {
      return res.status(400).json({
        success: false,
        message: `D2DC demand already exists for ${month}`
      });
    }

    // Calculate arrears from previous unpaid D2DC demands
    const previousDemands = await Demand.findAll({
      where: {
        propertyId,
        serviceType: 'D2DC',
        financialYear: { [Op.ne]: month },
        status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
      }
    });

    const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
      return sum + parseFloat(prevDemand.balanceAmount || 0);
    }, 0) * 100) / 100;

    const calculatedBaseAmount = parseFloat(baseAmount || 50);
    const totalAmount = Math.round((calculatedBaseAmount + arrearsAmount) * 100) / 100;
    const balanceAmount = Math.round(totalAmount * 100) / 100;

    // CRITICAL: D2DC demands MUST have assessmentId = null
    // D2DC is a municipal service, NOT a tax assessment
    // It is linked directly to property, not assessment

    const demandNumber = `D2DC-${month}-${Date.now()}`;
    const demand = await Demand.create({
      demandNumber,
      propertyId,
      assessmentId: null, // EXPLICITLY NULL - D2DC doesn't require assessment
      serviceType: 'D2DC',
      financialYear: month,
      baseAmount: calculatedBaseAmount,
      arrearsAmount,
      penaltyAmount: 0,
      interestAmount: 0,
      totalAmount,
      balanceAmount,
      paidAmount: 0,
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      status: 'pending',
      generatedBy: req.user.id,
      remarks
    });

    const createdDemand = await Demand.findByPk(demand.id, {
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email'] }
          ]
        }
      ]
    });

    // Log D2DC demand creation
    // Use 'Demand' as entityType since D2DC is a serviceType of Demand, not a separate entity
    await auditLogger.logCreate(
      req,
      req.user,
      'Demand',
      demand.id,
      {
        demandNumber: demand.demandNumber,
        propertyId: demand.propertyId,
        month: month,
        totalAmount: demand.totalAmount,
        serviceType: 'D2DC'
      },
      `Created D2DC demand: ${demand.demandNumber} for ${month}`,
      { propertyId: demand.propertyId, serviceType: 'D2DC' }
    );

    res.status(201).json({
      success: true,
      message: 'D2DC demand generated successfully',
      data: { demand: createdDemand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/generate-bulk
 * @desc    Generate demands in bulk for a financial year
 * @access  Private (Admin only)
 */
export const generateBulkDemands = async (req, res, next) => {
  try {
    const { financialYear, dueDate } = req.body;

    // Get all approved assessments
    const assessments = await Assessment.findAll({
      where: { status: 'approved' },
      include: [{ model: Property, as: 'property' }]
    });

    const createdDemands = [];
    const errors = [];

    for (const assessment of assessments) {
      try {
        // Check if demand already exists
        const existingDemand = await Demand.findOne({
          where: {
            assessmentId: assessment.id,
            financialYear
          }
        });

        if (existingDemand) {
          errors.push({
            assessmentId: assessment.id,
            message: 'Demand already exists'
          });
          continue;
        }

        // Calculate arrears from previous unpaid demands
        const previousDemands = await Demand.findAll({
          where: {
            propertyId: assessment.propertyId,
            financialYear: { [Op.ne]: financialYear },
            status: { [Op.in]: ['pending', 'overdue', 'partially_paid'] }
          }
        });

        // Calculate arrears - ensure numeric conversion
        const arrearsAmount = Math.round(previousDemands.reduce((sum, prevDemand) => {
          return sum + parseFloat(prevDemand.balanceAmount || 0);
        }, 0) * 100) / 100;

        const demandNumber = `DEM-${financialYear}-${Date.now()}-${assessment.id}`;
        const baseAmount = parseFloat(assessment.annualTaxAmount || 0);
        const totalAmount = Math.round((baseAmount + arrearsAmount) * 100) / 100;
        const balanceAmount = Math.round(totalAmount * 100) / 100;

        const demand = await Demand.create({
          demandNumber,
          propertyId: assessment.propertyId,
          assessmentId: assessment.id,
          serviceType: 'HOUSE_TAX', // Bulk generation is for house tax only
          financialYear,
          baseAmount,
          arrearsAmount,
          penaltyAmount: 0,
          interestAmount: 0,
          totalAmount,
          balanceAmount: balanceAmount,
          paidAmount: 0,
          dueDate: new Date(dueDate),
          status: 'pending',
          generatedBy: req.user.id
        });

        createdDemands.push(demand);
      } catch (error) {
        errors.push({
          assessmentId: assessment.id,
          message: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${createdDemands.length} demands`,
      data: {
        created: createdDemands.length,
        errors: errors.length,
        details: errors
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/generate-bulk-shop
 * @desc    Generate shop tax demands in bulk for all approved shop assessments (financial year)
 * @access  Private (Admin, Assessor, Clerk)
 */
export const generateBulkShopDemands = async (req, res, next) => {
  try {
    const { financialYear, dueDate } = req.body;

    if (!financialYear || typeof financialYear !== 'string' || !/^\d{4}-\d{2}$/.test(financialYear.trim())) {
      return res.status(400).json({
        success: false,
        message: 'financialYear is required (e.g. 2024-25)'
      });
    }

    const fy = financialYear.trim();
    const dueDateResolved = dueDate ? new Date(dueDate) : new Date(`${fy.split('-')[1]}-03-31`);

    // Only approved assessments; shop must be active (financial logic unchanged)
    const assessments = await ShopTaxAssessment.findAll({
      where: { status: 'approved' },
      include: [{ model: Shop, as: 'shop', where: { status: 'active' }, required: true }]
    });

    const created = [];
    const skipped = [];
    const errorDetails = [];

    console.log(`[generateBulkShopDemands] FY=${fy}, assessments to process=${assessments.length}`);

    for (const assessment of assessments) {
      const shop = assessment.shop;
      const assessmentId = assessment.id;
      const shopId = shop?.id;
      const assessmentStatus = assessment.status;

      console.log(`[generateBulkShopDemands] assessmentId=${assessmentId}, status=${assessmentStatus}, shopId=${shopId}, financialYear=${assessment.financialYear || 'null'}`);

      if (!shop || !shop.propertyId) {
        const msg = 'Shop or property missing';
        console.error(`[generateBulkShopDemands] assessmentId=${assessmentId} error: ${msg}`);
        errorDetails.push({ assessmentId, errorMessage: msg });
        continue;
      }

      const existingDemand = await Demand.findOne({
        where: {
          shopTaxAssessmentId: assessment.id,
          financialYear: fy,
          serviceType: 'SHOP_TAX'
        }
      });

      if (existingDemand) {
        console.log(`[generateBulkShopDemands] assessmentId=${assessmentId} skipped (existing demand id=${existingDemand.id})`);
        skipped.push({ assessmentId, shopId, demandId: existingDemand.id });
        continue;
      }

      try {
        const baseAmount = parseFloat(assessment.annualTaxAmount || 0);
        const totalAmount = Math.round(baseAmount * 100) / 100;
        const demandNumber = `STD-${fy}-${Date.now()}-${shop.id}`;

        const demand = await Demand.create({
          demandNumber,
          propertyId: shop.propertyId,
          assessmentId: null,
          waterTaxAssessmentId: null,
          shopTaxAssessmentId: assessment.id,
          serviceType: 'SHOP_TAX',
          financialYear: fy,
          baseAmount,
          arrearsAmount: 0,
          penaltyAmount: 0,
          interestAmount: 0,
          totalAmount,
          balanceAmount: totalAmount,
          paidAmount: 0,
          dueDate: dueDateResolved,
          status: 'pending',
          generatedBy: req.user.id,
          remarks: `Bulk generated for shop ${shop.shopNumber}`
        });
        created.push({ demandId: demand.id, shopId, assessmentId });
        console.log(`[generateBulkShopDemands] assessmentId=${assessmentId} created demandId=${demand.id}`);
      } catch (err) {
        const isUnique = err.name === 'SequelizeUniqueConstraintError' || (err.parent && err.parent.code === '23505');
        if (isUnique) {
          const existing = await Demand.findOne({
            where: { shopTaxAssessmentId: assessment.id, financialYear: fy, serviceType: 'SHOP_TAX' }
          });
          if (existing) {
            console.log(`[generateBulkShopDemands] assessmentId=${assessmentId} skipped (duplicate constraint, demand id=${existing.id})`);
            skipped.push({ assessmentId, shopId, demandId: existing.id });
          } else {
            const msg = err.message || 'Duplicate demand';
            console.error(`[generateBulkShopDemands] assessmentId=${assessmentId} error: ${msg}`);
            errorDetails.push({ assessmentId, errorMessage: msg });
          }
        } else {
          const msg = err.message || String(err);
          console.error(`[generateBulkShopDemands] assessmentId=${assessmentId} error: ${msg}`);
          errorDetails.push({ assessmentId, errorMessage: msg });
        }
      }
    }

    const createdCount = created.length;
    const skippedCount = skipped.length;

    res.status(201).json({
      success: true,
      message: `Shop demands: ${createdCount} created, ${skippedCount} already existed${errorDetails.length ? `, ${errorDetails.length} errors` : ''}`,
      data: {
        createdCount,
        skippedCount,
        errorDetails,
        created,
        skipped: skipped.length ? skipped : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/demands/:id/calculate-penalty
 * @desc    Calculate and update penalty/interest for overdue demand
 * @access  Private (Admin, Cashier)
 */
export const calculatePenalty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { penaltyRate, interestRate } = req.body;

    const demand = await Demand.findByPk(id);
    if (!demand) {
      return res.status(404).json({
        success: false,
        message: 'Tax Demand not found'
      });
    }

    // Calculate penalty and interest if overdue
    const today = new Date();
    const dueDate = new Date(demand.dueDate);

    if (today > dueDate && demand.balanceAmount > 0) {
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      // Calculate penalty (one-time, on base amount + arrears)
      const penaltyBase = parseFloat(demand.baseAmount || 0) + parseFloat(demand.arrearsAmount || 0);
      // Ensure all values are numbers before calculation
      const baseAmount = parseFloat(demand.baseAmount || 0);
      const arrearsAmount = parseFloat(demand.arrearsAmount || 0);
      const paidAmount = parseFloat(demand.paidAmount || 0);
      const balanceAmount = parseFloat(demand.balanceAmount || 0);

      const penalty = Math.round((penaltyBase * (penaltyRate || 0.05) / 100) * 100) / 100;

      // Calculate interest (daily, on balance amount)
      const interest = Math.round((balanceAmount * (interestRate || 0.01) / 100) * daysOverdue * 100) / 100;

      // Calculate totals using proper numeric arithmetic
      const totalAmount = Math.round((baseAmount + arrearsAmount + penalty + interest) * 100) / 100;
      const newBalanceAmount = Math.round((totalAmount - paidAmount) * 100) / 100;

      demand.penaltyAmount = penalty;
      demand.interestAmount = interest;
      demand.totalAmount = totalAmount;
      demand.balanceAmount = newBalanceAmount;

      if (demand.status === 'pending' && daysOverdue > 0) {
        demand.status = 'overdue';
      }

      await demand.save();
    }

    res.json({
      success: true,
      message: 'Penalty and interest calculated',
      data: { demand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/demands/property/:propertyId
 * @desc    Get all demands for a property
 * @access  Private
 */
export const getDemandsByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const demands = await Demand.findAll({
      where: { propertyId },
      include: [
        { model: Assessment, as: 'assessment', required: false }, // Optional for D2DC
        {
          model: Payment,
          as: 'payments',
          include: [
            { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] }
          ]
        }
      ],
      order: [['serviceType', 'ASC'], ['financialYear', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { demands }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/demands/statistics/summary
 * @desc    Get demand statistics summary
 * @access  Private (Admin, Cashier)
 */
export const getDemandStatistics = async (req, res, next) => {
  try {
    const { financialYear } = req.query;

    const where = {};
    if (financialYear) where.financialYear = financialYear;

    // For citizens, filter by their properties
    if (req.user.role === 'citizen') {
      const userProperties = await Property.findAll({
        where: { ownerId: req.user.id },
        attributes: ['id']
      });
      const propertyIds = userProperties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    const demands = await Demand.findAll({ where });

    // Separate statistics by serviceType
    const houseTaxDemands = demands.filter(d => d.serviceType === 'HOUSE_TAX');
    const d2dcDemands = demands.filter(d => d.serviceType === 'D2DC');

    const calculateStats = (demandList) => ({
      total: demandList.length,
      totalAmount: demandList.reduce((sum, d) => sum + parseFloat(d.totalAmount || 0), 0),
      paidAmount: demandList.reduce((sum, d) => sum + parseFloat(d.paidAmount || 0), 0),
      balanceAmount: demandList.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      arrearsAmount: demandList.reduce((sum, d) => sum + parseFloat(d.arrearsAmount || 0), 0),
      penaltyAmount: demandList.reduce((sum, d) => sum + parseFloat(d.penaltyAmount || 0), 0),
      interestAmount: demandList.reduce((sum, d) => sum + parseFloat(d.interestAmount || 0), 0),
      byStatus: {
        pending: demandList.filter(d => d.status === 'pending').length,
        partially_paid: demandList.filter(d => d.status === 'partially_paid').length,
        paid: demandList.filter(d => d.status === 'paid').length,
        overdue: demandList.filter(d => d.status === 'overdue').length,
        cancelled: demandList.filter(d => d.status === 'cancelled').length
      },
      overdue: demandList.filter(d => {
        const today = new Date();
        const dueDate = new Date(d.dueDate);
        return today > dueDate && d.balanceAmount > 0;
      }).length
    });

    const statistics = {
      // Combined statistics
      total: demands.length,
      totalAmount: demands.reduce((sum, d) => sum + parseFloat(d.totalAmount || 0), 0),
      paidAmount: demands.reduce((sum, d) => sum + parseFloat(d.paidAmount || 0), 0),
      balanceAmount: demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0),
      // Separate by serviceType
      houseTax: calculateStats(houseTaxDemands),
      d2dc: calculateStats(d2dcDemands),
      // Overall byStatus
      byStatus: {
        pending: demands.filter(d => d.status === 'pending').length,
        partially_paid: demands.filter(d => d.status === 'partially_paid').length,
        paid: demands.filter(d => d.status === 'paid').length,
        overdue: demands.filter(d => d.status === 'overdue').length,
        cancelled: demands.filter(d => d.status === 'cancelled').length
      },
      overdue: demands.filter(d => {
        const today = new Date();
        const dueDate = new Date(d.dueDate);
        return today > dueDate && d.balanceAmount > 0;
      }).length
    };

    res.json({
      success: true,
      data: { statistics }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/demands/generate-unified
 * @desc    Generate unified tax demand (Property + Water Tax) for a property
 * @access  Private (Admin, Assessor)
 */
export const generateUnifiedDemand = async (req, res, next) => {
  try {
    const {
      propertyId,
      property_id,
      assessmentYear,
      assessment_year,
      financialYear,
      financial_year,
      dueDate,
      due_date,
      remarks,
      defaultTaxRate,
      includeShopDemands,
      includeD2DCDemand,
      d2dcMonth,
      d2dcBaseAmount
    } = req.body;

    // Normalize to camelCase
    const normalizedPropertyId = propertyId || property_id;
    const normalizedAssessmentYear = assessmentYear || assessment_year;
    const normalizedFinancialYear = financialYear || financial_year;
    const normalizedDueDate = dueDate || due_date;

    // Validation
    if (!normalizedPropertyId) {
      return res.status(400).json({
        success: false,
        message: 'propertyId is required'
      });
    }

    if (!normalizedAssessmentYear) {
      return res.status(400).json({
        success: false,
        message: 'assessmentYear is required'
      });
    }

    if (!normalizedFinancialYear) {
      return res.status(400).json({
        success: false,
        message: 'financialYear is required (format: YYYY-YY, e.g., 2024-25)'
      });
    }

    // Validate D2DC month if D2DC is requested
    if (includeD2DCDemand && !d2dcMonth) {
      return res.status(400).json({
        success: false,
        message: 'd2dcMonth is required when includeD2DCDemand is true (format: YYYY-MM, e.g., 2024-01)'
      });
    }

    // Generate unified assessment and demand (with optional Shop/D2DC)
    const result = await generateUnifiedTaxAssessmentAndDemand({
      propertyId: parseInt(normalizedPropertyId),
      assessmentYear: parseInt(normalizedAssessmentYear),
      financialYear: normalizedFinancialYear,
      assessorId: req.user.id,
      dueDate: normalizedDueDate ? new Date(normalizedDueDate) : null,
      remarks: remarks || null,
      defaultTaxRate: parseFloat(defaultTaxRate) || 1.5,
      includeShopDemands: includeShopDemands === true || includeShopDemands === 'true',
      includeD2DCDemand: includeD2DCDemand === true || includeD2DCDemand === 'true',
      d2dcMonth: d2dcMonth || null,
      d2dcBaseAmount: parseFloat(d2dcBaseAmount) || 50
    });

    // Log the action - Use 'Demand' as entityType since it's a valid enum value
    if (result.unifiedDemand?.id) {
      const logMessage = `Generated unified tax demand for property ${normalizedPropertyId}` +
        (result.shopDemands?.length > 0 ? ` + ${result.shopDemands.length} shop demand(s)` : '') +
        (result.d2dcDemand ? ' + D2DC demand' : '');
      
      await auditLogger.logCreate(
        req,
        req.user,
        'Demand',
        result.unifiedDemand.id,
        {
          propertyId: normalizedPropertyId,
          assessmentYear: normalizedAssessmentYear,
          financialYear: normalizedFinancialYear,
          includeShopDemands: includeShopDemands === true || includeShopDemands === 'true',
          includeD2DCDemand: includeD2DCDemand === true || includeD2DCDemand === 'true',
          shopDemandsCount: result.shopDemands?.length || 0,
          d2dcDemandCreated: !!result.d2dcDemand
        },
        logMessage,
        { propertyId: normalizedPropertyId }
      );
    }

    // Build success message
    let successMessage = 'Unified tax demand generated successfully';
    if (result.shopDemands?.length > 0) {
      successMessage += ` (${result.shopDemands.length} shop demand(s))`;
    }
    if (result.d2dcDemand) {
      successMessage += ' (D2DC demand)';
    }

    res.status(201).json({
      success: true,
      message: successMessage,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/demands/:id/breakdown
 * @desc    Get unified demand breakdown (if it's a unified demand)
 * @access  Private
 */
export const getDemandBreakdown = async (req, res, next) => {
  try {
    const { id } = req.params;

    const breakdown = await getUnifiedDemandBreakdown(parseInt(id));

    res.json({
      success: true,
      data: {
        ...breakdown,
        // Option A: Penalty/interest are demand-level only (items remain 0)
        penaltyModel: breakdown?.breakdown?.penaltyModel || 'DEMAND_LEVEL'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/tax/unified-summary
 * @desc    Get unified tax summary for a property
 * @access  Private
 */
export const getUnifiedTaxSummary = async (req, res, next) => {
  try {
    const { propertyId, assessmentYear } = req.query;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'propertyId is required'
      });
    }

    const summary = await getUnifiedTaxSummaryService(
      parseInt(propertyId),
      assessmentYear ? parseInt(assessmentYear) : null
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
