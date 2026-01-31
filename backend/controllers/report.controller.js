import { Payment, Demand, DemandItem, Property, Assessment, Ward, User, WaterConnection, WaterBill, WaterPayment } from '../models/index.js';
import { Op, Sequelize } from 'sequelize';
import { WATER_PAYMENT_STATUS, getUnpaidBillStatuses } from '../constants/waterTaxStatuses.js';

/**
 * Helper function to check if a demand is unified (contains both property and water tax)
 * @param {Demand} demand - The demand object
 * @returns {boolean} - True if demand is unified
 */
const isUnifiedDemand = (demand) => {
  if (!demand) return false;
  
  // Check if remarks contains UNIFIED_DEMAND
  if (demand.remarks && typeof demand.remarks === 'string') {
    if (demand.remarks.includes('UNIFIED_DEMAND')) {
      return true;
    }
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(demand.remarks);
      if (parsed.type === 'UNIFIED_DEMAND') {
        return true;
      }
    } catch (e) {
      // Not JSON, continue checking
    }
  }
  
  // Check if demand has items (unified demands have demand items)
  if (demand.items && Array.isArray(demand.items) && demand.items.length > 0) {
    const hasPropertyItem = demand.items.some(item => item.taxType === 'PROPERTY');
    const hasWaterItem = demand.items.some(item => item.taxType === 'WATER');
    if (hasPropertyItem && hasWaterItem) {
      return true;
    }
  }
  
  return false;
};

/**
 * Helper function to split payment amount for unified demands based on demand items
 * @param {Payment} payment - The payment object
 * @param {Demand} demand - The demand object (must have items loaded)
 * @returns {Object} - Object with propertyTaxAmount and waterTaxAmount
 */
const splitUnifiedPayment = (payment, demand) => {
  if (!isUnifiedDemand(demand) || !demand.items || demand.items.length === 0) {
    // Not unified or no items, return full amount based on serviceType
    if (demand?.serviceType === 'HOUSE_TAX') {
      return { propertyTaxAmount: parseFloat(payment.amount || 0), waterTaxAmount: 0 };
    } else if (demand?.serviceType === 'WATER_TAX') {
      return { propertyTaxAmount: 0, waterTaxAmount: parseFloat(payment.amount || 0) };
    }
    return { propertyTaxAmount: 0, waterTaxAmount: 0 };
  }
  
  const paymentAmount = parseFloat(payment.amount || 0);
  const demandBaseAmount = parseFloat(demand.baseAmount || 0);
  
  // Calculate total base amount for property and water items separately
  let propertyBaseAmount = 0;
  let waterBaseAmount = 0;
  
  demand.items.forEach(item => {
    const itemBaseAmount = parseFloat(item.baseAmount || 0);
    if (item.taxType === 'PROPERTY') {
      propertyBaseAmount += itemBaseAmount;
    } else if (item.taxType === 'WATER') {
      waterBaseAmount += itemBaseAmount;
    }
  });

  // Prefer splitting using item base totals (source of truth for unified demands).
  // Fallback to demand.baseAmount only if items base totals are unavailable.
  const itemsBaseTotal = propertyBaseAmount + waterBaseAmount;
  const splitDenominator = itemsBaseTotal > 0 ? itemsBaseTotal : demandBaseAmount;
  if (splitDenominator <= 0) {
    // Can't split proportionally; return full amount based on demand serviceType
    if (demand?.serviceType === 'HOUSE_TAX') {
      return { propertyTaxAmount: paymentAmount, waterTaxAmount: 0 };
    }
    if (demand?.serviceType === 'WATER_TAX') {
      return { propertyTaxAmount: 0, waterTaxAmount: paymentAmount };
    }
    return { propertyTaxAmount: 0, waterTaxAmount: 0 };
  }
  
  // Split payment proportionally based on base amounts
  const propertyTaxAmount = Math.round((paymentAmount * propertyBaseAmount / splitDenominator) * 100) / 100;
  const waterTaxAmount = Math.round((paymentAmount * waterBaseAmount / splitDenominator) * 100) / 100;
  
  // Handle rounding errors - ensure total equals payment amount
  const total = propertyTaxAmount + waterTaxAmount;
  const difference = paymentAmount - total;
  
  // Add rounding difference to the larger portion
  if (Math.abs(difference) > 0.01) {
    if (propertyTaxAmount >= waterTaxAmount) {
      return {
        propertyTaxAmount: propertyTaxAmount + difference,
        waterTaxAmount: waterTaxAmount
      };
    } else {
      return {
        propertyTaxAmount: propertyTaxAmount,
        waterTaxAmount: waterTaxAmount + difference
      };
    }
  }
  
  return { propertyTaxAmount, waterTaxAmount };
};

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Admin, Assessor, Cashier)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt[Op.gte] = new Date(startDate);
      if (endDate) dateFilter.createdAt[Op.lte] = new Date(endDate);
    }

    // Total Properties
    const totalProperties = await Property.count({
      where: { isActive: true, ...dateFilter }
    });

    // Total Assessments
    const totalAssessments = await Assessment.count({
      where: dateFilter
    });

    // Approved Assessments
    const approvedAssessments = await Assessment.count({
      where: { status: 'approved', ...dateFilter }
    });

    // Total Demands
    const totalDemands = await Demand.count({
      where: dateFilter
    });

    // Total Revenue - separate by serviceType
    // Include demand items for unified demand detection
    const payments = await Payment.findAll({
      where: {
        status: 'completed',
        ...(startDate || endDate ? {
          paymentDate: {
            ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
            ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
          }
        } : {})
      },
      include: [
        { 
          model: Demand, 
          as: 'demand', 
          attributes: ['id', 'serviceType', 'baseAmount', 'remarks'],
          required: false,
          include: [
            {
              model: DemandItem,
              as: 'items',
              attributes: ['id', 'taxType', 'baseAmount'],
              required: false
            }
          ]
        }
      ]
    });

    // Calculate revenue with unified demand splitting
    let totalRevenue = 0;
    let houseTaxRevenue = 0;
    let d2dcRevenue = 0;
    let waterTaxRevenueFromUnified = 0;
    
    payments.forEach(payment => {
      const paymentAmount = parseFloat(payment.amount || 0);
      totalRevenue += paymentAmount;
      
      const demand = payment.demand;
      if (!demand) {
        return;
      }
      
      // Check if unified demand
      if (isUnifiedDemand(demand)) {
        const split = splitUnifiedPayment(payment, demand);
        houseTaxRevenue += split.propertyTaxAmount;
        waterTaxRevenueFromUnified += split.waterTaxAmount;
      } else {
        // Regular demand - count by serviceType
        if (demand.serviceType === 'HOUSE_TAX') {
          houseTaxRevenue += paymentAmount;
        } else if (demand.serviceType === 'D2DC') {
          d2dcRevenue += paymentAmount;
        }
      }
    });

    // Pending Demands
    const pendingDemands = await Demand.count({
      where: { status: 'pending' }
    });

    // Overdue Demands
    const overdueDemands = await Demand.count({
      where: {
        status: 'overdue',
        balanceAmount: { [Op.gt]: 0 }
      }
    });

    // Total Outstanding Amount - separate by serviceType
    const outstandingDemands = await Demand.findAll({
      where: {
        balanceAmount: { [Op.gt]: 0 }
      },
      attributes: ['id', 'balanceAmount', 'serviceType']
    });

    const totalOutstanding = outstandingDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);
    const houseTaxOutstanding = outstandingDemands
      .filter(d => d.serviceType === 'HOUSE_TAX')
      .reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);
    const d2dcOutstanding = outstandingDemands
      .filter(d => d.serviceType === 'D2DC')
      .reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);

    // Separate demands by serviceType
    const houseTaxDemands = await Demand.count({
      where: { serviceType: 'HOUSE_TAX', ...dateFilter }
    });
    const d2dcDemands = await Demand.count({
      where: { serviceType: 'D2DC', ...dateFilter }
    });

    // Water Tax Metrics
    // Total Water Connections
    const totalWaterConnections = await WaterConnection.count({
      where: { status: 'ACTIVE' }
    });

    // Total Water Revenue (from completed water payments)
    const waterPayments = await WaterPayment.findAll({
      where: {
        status: WATER_PAYMENT_STATUS.COMPLETED,
        ...(startDate || endDate ? {
          paymentDate: {
            ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
            ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
          }
        } : {})
      },
      attributes: ['id', 'amount']
    });

    const totalWaterRevenue = waterPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    // Add water tax revenue from unified demands
    const totalWaterTaxRevenue = totalWaterRevenue + waterTaxRevenueFromUnified;

    // Water Outstanding Amount (from unpaid bills)
    const unpaidWaterBills = await WaterBill.findAll({
      where: {
        status: {
          [Op.in]: getUnpaidBillStatuses()
        },
        balanceAmount: { [Op.gt]: 0.01 } // Handle floating point precision
      },
      attributes: ['id', 'balanceAmount']
    });

    const waterOutstanding = unpaidWaterBills.reduce((sum, bill) => sum + parseFloat(bill.balanceAmount || 0), 0);

    res.json({
      success: true,
      data: {
        totalProperties,
        totalAssessments,
        approvedAssessments,
        totalDemands,
        houseTaxDemands,
        d2dcDemands,
        totalRevenue,
        houseTaxRevenue,
        d2dcRevenue,
        pendingDemands,
        overdueDemands,
        totalOutstanding,
        houseTaxOutstanding,
        d2dcOutstanding,
        // Water Tax Metrics
        totalWaterConnections,
        totalWaterRevenue: totalWaterTaxRevenue, // Includes unified demand water tax portion
        waterOutstanding
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/revenue
 * @desc    Get revenue report
 * @access  Private (Admin, Cashier)
 */
export const getRevenueReport = async (req, res, next) => {
  try {
    const { startDate, endDate, wardId, paymentMode, taxType } = req.query;

    const where = {
      status: 'completed'
    };

    if (paymentMode) where.paymentMode = paymentMode;

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate[Op.gte] = new Date(startDate);
      if (endDate) where.paymentDate[Op.lte] = new Date(endDate);
    }

    if (wardId) {
      const properties = await Property.findAll({
        where: { wardId },
        attributes: ['id']
      });
      const propertyIds = properties.map(p => p.id);
      where.propertyId = { [Op.in]: propertyIds };
    }

    // Build include for Demand with optional serviceType filter
    // Always include demand items for unified demand detection
    const demandInclude = {
      model: Demand,
      as: 'demand',
      attributes: ['id', 'demandNumber', 'serviceType', 'baseAmount', 'remarks'],
      required: false,
      include: [
        {
          model: DemandItem,
          as: 'items',
          attributes: ['id', 'taxType', 'baseAmount'],
          required: false
        }
      ]
    };
    
    if (taxType && taxType !== 'WATER_TAX') {
      // For HOUSE_TAX or D2DC, filter by serviceType in demand
      // But we still need to check for unified demands
      demandInclude.where = { serviceType: taxType };
      demandInclude.required = true;
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          include: [
            { model: Ward, as: 'ward' },
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }
          ]
        },
        { model: User, as: 'cashier', attributes: ['id', 'firstName', 'lastName'] },
        demandInclude
      ],
      order: [['paymentDate', 'DESC']]
    });

    // Calculate totals - separate by serviceType with unified demand splitting
    let totalAmount = 0;
    let houseTaxAmount = 0;
    let d2dcAmount = 0;
    let waterTaxAmount = 0;
    let waterTaxAmountFromUnified = 0;
    
    payments.forEach(payment => {
      const paymentAmount = parseFloat(payment.amount || 0);
      totalAmount += paymentAmount;
      
      const demand = payment.demand;
      if (!demand) {
        return;
      }
      
      // Check if unified demand
      if (isUnifiedDemand(demand)) {
        const split = splitUnifiedPayment(payment, demand);
        houseTaxAmount += split.propertyTaxAmount;
        waterTaxAmountFromUnified += split.waterTaxAmount;
      } else {
        // Regular demand - count by serviceType
        if (demand.serviceType === 'HOUSE_TAX') {
          houseTaxAmount += paymentAmount;
        } else if (demand.serviceType === 'D2DC') {
          d2dcAmount += paymentAmount;
        } else if (demand.serviceType === 'WATER_TAX') {
          waterTaxAmount += paymentAmount;
        }
      }
    });
    
    // Get Water Tax revenue from WaterPayment table (only if taxType is not specified or is WATER_TAX)
    let waterPayments = [];
    if (!taxType || taxType === 'WATER_TAX') {
      waterPayments = await WaterPayment.findAll({
        where: {
          status: WATER_PAYMENT_STATUS.COMPLETED,
          ...(startDate || endDate ? {
            paymentDate: {
              ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
              ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
            }
          } : {})
        },
        attributes: ['id', 'amount']
      });
    }

    const waterTaxRevenueFromPayments = waterPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    // Include unified demand water tax portion
    const totalWaterTaxRevenue = waterTaxAmount + waterTaxAmountFromUnified + waterTaxRevenueFromPayments;
    
    // Filter payments if taxType is specified
    // For unified demands, we need to check if they contain the requested tax type
    let filteredPayments = payments;
    if (taxType) {
      if (taxType === 'HOUSE_TAX') {
        // Include HOUSE_TAX demands and unified demands (which contain property tax)
        filteredPayments = payments.filter(p => {
          if (!p.demand) return false;
          if (isUnifiedDemand(p.demand)) return true; // Unified demands contain property tax
          return p.demand.serviceType === 'HOUSE_TAX';
        });
      } else if (taxType === 'D2DC') {
        filteredPayments = payments.filter(p => p.demand?.serviceType === 'D2DC');
      } else if (taxType === 'WATER_TAX') {
        // Include WATER_TAX demands, unified demands (which contain water tax), and water payments
        filteredPayments = payments.filter(p => {
          if (!p.demand) return false;
          if (isUnifiedDemand(p.demand)) return true; // Unified demands contain water tax
          return p.demand.serviceType === 'WATER_TAX';
        });
      }
    }
    
    // Group by payment mode (from regular payments)
    const byPaymentMode = payments.reduce((acc, p) => {
      acc[p.paymentMode] = (acc[p.paymentMode] || 0) + parseFloat(p.amount);
      return acc;
    }, {});

    // Group by serviceType (includes unified demand splits)
    const byServiceType = {
      HOUSE_TAX: houseTaxAmount,
      D2DC: d2dcAmount,
      WATER_TAX: totalWaterTaxRevenue
    };

    // Calculate filtered totals based on taxType
    // Note: totalAmount already includes all payments, and totalWaterTaxRevenue includes unified demand water portion
    let finalTotalAmount = totalAmount + waterTaxRevenueFromPayments; // totalAmount includes unified, add standalone water payments
    let finalHouseTaxAmount = houseTaxAmount;
    let finalD2dcAmount = d2dcAmount;
    let finalWaterTaxAmount = totalWaterTaxRevenue;
    let finalTotalCount = payments.length + waterPayments.length;
    
    // Count payments by type (unified demands count for both property and water)
    let houseTaxCount = 0;
    let d2dcCount = 0;
    let waterTaxCount = waterPayments.length;
    
    payments.forEach(p => {
      if (!p.demand) return;
      if (isUnifiedDemand(p.demand)) {
        houseTaxCount++; // Unified demands contribute to property tax count
        waterTaxCount++; // Unified demands also contribute to water tax count
      } else {
        if (p.demand.serviceType === 'HOUSE_TAX') houseTaxCount++;
        else if (p.demand.serviceType === 'D2DC') d2dcCount++;
        else if (p.demand.serviceType === 'WATER_TAX') waterTaxCount++;
      }
    });
    
    let finalHouseTaxCount = houseTaxCount;
    let finalD2dcCount = d2dcCount;
    let finalWaterTaxCount = waterTaxCount;
    
    if (taxType) {
      if (taxType === 'HOUSE_TAX') {
        finalTotalAmount = houseTaxAmount;
        finalHouseTaxAmount = houseTaxAmount;
        finalD2dcAmount = 0;
        finalWaterTaxAmount = 0;
        finalTotalCount = houseTaxCount;
        finalD2dcCount = 0;
        finalWaterTaxCount = 0;
      } else if (taxType === 'D2DC') {
        finalTotalAmount = d2dcAmount;
        finalHouseTaxAmount = 0;
        finalD2dcAmount = d2dcAmount;
        finalWaterTaxAmount = 0;
        finalTotalCount = d2dcCount;
        finalHouseTaxCount = 0;
        finalWaterTaxCount = 0;
      } else if (taxType === 'WATER_TAX') {
        finalTotalAmount = totalWaterTaxRevenue;
        finalHouseTaxAmount = 0;
        finalD2dcAmount = 0;
        finalWaterTaxAmount = totalWaterTaxRevenue;
        finalTotalCount = waterTaxCount;
        finalHouseTaxCount = 0;
        finalD2dcCount = 0;
      }
    }

    // Include water payments in response if taxType is not specified or is WATER_TAX
    const responseData = {
      payments: filteredPayments,
      summary: {
        totalAmount: finalTotalAmount,
        houseTaxAmount: finalHouseTaxAmount,
        d2dcAmount: finalD2dcAmount,
        waterTaxAmount: finalWaterTaxAmount,
        totalCount: finalTotalCount,
        houseTaxCount: finalHouseTaxCount,
        d2dcCount: finalD2dcCount,
        waterTaxCount: finalWaterTaxCount,
        byPaymentMode,
        byServiceType
      }
    };
    
    // Include water payments for chart data if needed
    if (!taxType || taxType === 'WATER_TAX') {
      responseData.waterPayments = waterPayments;
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/outstanding
 * @desc    Get outstanding demands report
 * @access  Private (Admin, Tax Collector)
 */
export const getOutstandingReport = async (req, res, next) => {
  try {
    const { wardId, status } = req.query;

    const where = {
      balanceAmount: { [Op.gt]: 0 }
    };

    if (status) where.status = status;

    let propertyWhere = {};
    if (wardId) propertyWhere.wardId = wardId;

    const demands = await Demand.findAll({
      where,
      include: [
        {
          model: Property,
          as: 'property',
          where: propertyWhere,
          include: [
            { model: Ward, as: 'ward' },
            { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }
          ]
        },
        { model: Assessment, as: 'assessment', required: false }
      ],
      order: [['serviceType', 'ASC'], ['dueDate', 'ASC']]
    });

    // Separate by serviceType
    const houseTaxDemands = demands.filter(d => d.serviceType === 'HOUSE_TAX');
    const d2dcDemands = demands.filter(d => d.serviceType === 'D2DC');
    
    const houseTaxOutstanding = houseTaxDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);
    const d2dcOutstanding = d2dcDemands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);

    const totalOutstanding = demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);

    res.json({
      success: true,
      data: {
        demands,
        houseTaxDemands,
        d2dcDemands,
        summary: {
          totalOutstanding,
          houseTaxOutstanding,
          d2dcOutstanding,
          totalCount: demands.length,
          houseTaxCount: houseTaxDemands.length,
          d2dcCount: d2dcDemands.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/ward-wise
 * @desc    Get ward-wise collection report
 * @access  Private (Admin)
 */
export const getWardWiseReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const wards = await Ward.findAll({
      where: { isActive: true },
      include: [
        { model: User, as: 'collector', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    const report = await Promise.all(wards.map(async (ward) => {
      const properties = await Property.findAll({
        where: { wardId: ward.id },
        attributes: ['id']
      });
      const propertyIds = properties.map(p => p.id);

      const payments = await Payment.findAll({
        where: {
          propertyId: { [Op.in]: propertyIds },
          status: 'completed',
          ...(startDate || endDate ? {
            paymentDate: {
              ...(startDate ? { [Op.gte]: new Date(startDate) } : {}),
              ...(endDate ? { [Op.lte]: new Date(endDate) } : {})
            }
          } : {})
        }
      });

      const demands = await Demand.findAll({
        where: {
          propertyId: { [Op.in]: propertyIds }
        }
      });

      const totalCollection = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalOutstanding = demands
        .filter(d => parseFloat(d.balanceAmount) > 0)
        .reduce((sum, d) => sum + parseFloat(d.balanceAmount), 0);

      return {
        ward: {
          id: ward.id,
          wardNumber: ward.wardNumber,
          wardName: ward.wardName,
          collector: ward.collector
        },
        totalProperties: properties.length,
        totalCollection,
        totalOutstanding,
        paymentCount: payments.length
      };
    }));

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    next(error);
  }
};
