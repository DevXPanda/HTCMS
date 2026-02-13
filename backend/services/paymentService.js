import { Demand, DemandItem, Payment } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Payment Distribution Service
 * 
 * Handles item-level payment distribution for unified demands
 * to fix the critical financial design gap.
 */

/**
 * Distribute payment amount across demand items
 * 
 * @param {number} demandId - Demand ID
 * @param {number} paymentAmount - Payment amount to distribute
 * @param {Object} transaction - Database transaction
 * @returns {Promise<Object>} Distribution result
 */
export const distributePaymentAcrossItems = async (demandId, paymentAmount, transaction = null) => {
  try {
    // Get demand with items, ordered by tax type (PROPERTY first, then WATER)
    const demand = await Demand.findByPk(demandId, {
      include: [
        {
          model: DemandItem,
          as: 'items',
          order: [
            // Property tax items first, then water tax items
            [sequelize.literal(`CASE WHEN taxType = 'PROPERTY' THEN 0 ELSE 1 END`), 'ASC'],
            ['id', 'ASC']
          ]
        }
      ],
      transaction
    });

    if (!demand) {
      throw new Error('Demand not found');
    }

    // Demands without items (SHOP_TAX, D2DC, or single WATER_TAX): apply payment directly to Demand.
    // SHOP_TAX test scenarios: (1) On-time: full payment before dueDate -> status paid.
    // (2) Partial: payment < balanceAmount -> status partially_paid.
    // (3) Overdue with penalty: penaltyCron sets overdue/penaltyAmount; payment reduces balance.
    // (4) Fully paid after penalty: pay totalAmount (base + penalty + interest) -> status paid.
    if (!demand.items || demand.items.length === 0) {
      const demandBalance = parseFloat(demand.balanceAmount || 0);
      if (paymentAmount > demandBalance) {
        throw new Error(`Payment amount (₹${paymentAmount.toFixed(2)}) exceeds demand balance (₹${demandBalance.toFixed(2)})`);
      }
      const currentPaid = parseFloat(demand.paidAmount || 0);
      const totalAmount = parseFloat(demand.totalAmount || 0);
      const newPaidAmount = Math.round((currentPaid + paymentAmount) * 100) / 100;
      const newBalanceAmount = Math.round((totalAmount - newPaidAmount) * 100) / 100;
      const newStatus = newBalanceAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partially_paid' : demand.status;

      await Demand.update(
        {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus
        },
        { where: { id: demandId }, transaction }
      );

      return {
        success: true,
        demandId,
        paymentAmount,
        remainingPayment: 0,
        demandBalance: newBalanceAmount,
        distributionResults: [],
        summary: {
          totalItems: 0,
          itemsUpdated: 0,
          itemsFullyPaid: 0,
          propertyTaxPaid: 0,
          waterTaxPaid: 0,
          directDemandPayment: true,
          serviceType: demand.serviceType || null
        }
      };
    }

    // Calculate current item balances
    const itemsWithBalances = demand.items.map(item => ({
      ...item.toJSON(),
      currentPaid: parseFloat(item.paidAmount || 0),
      totalAmount: parseFloat(item.totalAmount || 0),
      remainingBalance: parseFloat(item.totalAmount || 0) - parseFloat(item.paidAmount || 0)
    }));

    // Validate total payment amount doesn't exceed demand balance
    const demandBalance = parseFloat(demand.balanceAmount || 0);
    if (paymentAmount > demandBalance) {
      throw new Error(`Payment amount (₹${paymentAmount.toFixed(2)}) exceeds demand balance (₹${demandBalance.toFixed(2)})`);
    }

    // Distribute payment sequentially
    let remainingPayment = paymentAmount;
    const distributionResults = [];

    for (const item of itemsWithBalances) {
      if (remainingPayment <= 0) break;

      const itemBalance = item.remainingBalance;
      
      if (itemBalance <= 0) {
        // Item already fully paid
        distributionResults.push({
          itemId: item.id,
          taxType: item.taxType,
          previousPaid: item.currentPaid,
          paymentApplied: 0,
          newPaid: item.currentPaid,
          itemBalance: 0,
          status: 'already_paid'
        });
        continue;
      }

      // Apply payment to this item
      const paymentForItem = Math.min(remainingPayment, itemBalance);
      const newPaidAmount = item.currentPaid + paymentForItem;

      // Update the demand item
      await DemandItem.update(
        { paidAmount: newPaidAmount },
        {
          where: { id: item.id },
          transaction
        }
      );

      distributionResults.push({
        itemId: item.id,
        taxType: item.taxType,
        previousPaid: item.currentPaid,
        paymentApplied: paymentForItem,
        newPaid: newPaidAmount,
        itemBalance: itemBalance - paymentForItem,
        status: paymentForItem >= itemBalance ? 'fully_paid' : (paymentForItem >= (itemBalance * 0.49) && paymentForItem <= (itemBalance * 0.51)) ? 'partially_paid' : 'pending'
      });

      remainingPayment -= paymentForItem;
    }

    // Update demand totals
    const totalItemPaid = itemsWithBalances.reduce((sum, item) => {
      const updatedItem = distributionResults.find(result => result.itemId === item.id);
      return sum + (updatedItem ? updatedItem.newPaid : item.currentPaid);
    }, 0);

    const totalItemAmount = itemsWithBalances.reduce((sum, item) => sum + item.totalAmount, 0);
    const newDemandBalance = totalItemAmount - totalItemPaid;

    // Get the current demand to preserve assessmentId and totalAmount
    const currentDemand = await Demand.findByPk(demandId, {
      attributes: ['id', 'assessmentId', 'waterTaxAssessmentId', 'serviceType', 'remarks', 'totalAmount']
    });

    // Update demand
    await Demand.update(
      {
        paidAmount: totalItemPaid,
        balanceAmount: newDemandBalance,
        status: newDemandBalance <= 0 ? 'paid' : (totalItemPaid >= (parseFloat(currentDemand.totalAmount) * 0.49) && totalItemPaid <= (parseFloat(currentDemand.totalAmount) * 0.51)) ? 'partially_paid' : 'pending',
        // Preserve assessment IDs to avoid validation issues
        assessmentId: currentDemand.assessmentId,
        waterTaxAssessmentId: currentDemand.waterTaxAssessmentId,
        serviceType: currentDemand.serviceType,
        remarks: currentDemand.remarks
      },
      {
        where: { id: demandId },
        transaction
      }
    );

    return {
      success: true,
      demandId,
      paymentAmount,
      remainingPayment,
      demandBalance: newDemandBalance,
      distributionResults,
      summary: {
        totalItems: itemsWithBalances.length,
        itemsUpdated: distributionResults.filter(r => r.paymentApplied > 0).length,
        itemsFullyPaid: distributionResults.filter(r => r.status === 'fully_paid').length,
        propertyTaxPaid: distributionResults
          .filter(r => r.taxType === 'PROPERTY')
          .reduce((sum, r) => sum + r.paymentApplied, 0),
        waterTaxPaid: distributionResults
          .filter(r => r.taxType === 'WATER')
          .reduce((sum, r) => sum + r.paymentApplied, 0)
      }
    };

  } catch (error) {
    console.error('Payment distribution failed:', error);
    throw error;
  }
};

/**
 * Get payment distribution summary for a demand
 * 
 * @param {number} demandId - Demand ID
 * @returns {Promise<Object>} Payment summary
 */
export const getPaymentDistributionSummary = async (demandId) => {
  try {
    const demand = await Demand.findByPk(demandId, {
      include: [
        {
          model: DemandItem,
          as: 'items',
          order: [['taxType', 'ASC'], ['id', 'ASC']]
        }
      ]
    });

    if (!demand) {
      throw new Error('Demand not found');
    }

    // Demands without items (SHOP_TAX, D2DC, etc.): return demand-level summary only
    if (!demand.items || demand.items.length === 0) {
      return {
        demandId: demand.id,
        demandNumber: demand.demandNumber,
        totalAmount: parseFloat(demand.totalAmount || 0),
        totalPaid: parseFloat(demand.paidAmount || 0),
        balanceAmount: parseFloat(demand.balanceAmount || 0),
        status: demand.status,
        items: [],
        breakdown: {},
        validation: { totalMatches: true, paidMatches: true, balanceMatches: true },
        isValid: true,
        noItems: true
      };
    }

    const summary = {
      demandId: demand.id,
      demandNumber: demand.demandNumber,
      totalAmount: parseFloat(demand.totalAmount || 0),
      totalPaid: parseFloat(demand.paidAmount || 0),
      balanceAmount: parseFloat(demand.balanceAmount || 0),
      status: demand.status,
      items: demand.items.map(item => ({
        id: item.id,
        taxType: item.taxType,
        description: item.description,
        totalAmount: parseFloat(item.totalAmount || 0),
        paidAmount: parseFloat(item.paidAmount || 0),
        balanceAmount: parseFloat(item.totalAmount || 0) - parseFloat(item.paidAmount || 0),
        isFullyPaid: parseFloat(item.paidAmount || 0) >= parseFloat(item.totalAmount || 0)
      })),
      breakdown: {
        propertyTax: {
          totalAmount: demand.items
            .filter(item => item.taxType === 'PROPERTY')
            .reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0),
          paidAmount: demand.items
            .filter(item => item.taxType === 'PROPERTY')
            .reduce((sum, item) => sum + parseFloat(item.paidAmount || 0), 0),
          balanceAmount: demand.items
            .filter(item => item.taxType === 'PROPERTY')
            .reduce((sum, item) => sum + (parseFloat(item.totalAmount || 0) - parseFloat(item.paidAmount || 0)), 0)
        },
        waterTax: {
          totalAmount: demand.items
            .filter(item => item.taxType === 'WATER')
            .reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0),
          paidAmount: demand.items
            .filter(item => item.taxType === 'WATER')
            .reduce((sum, item) => sum + parseFloat(item.paidAmount || 0), 0),
          balanceAmount: demand.items
            .filter(item => item.taxType === 'WATER')
            .reduce((sum, item) => sum + (parseFloat(item.totalAmount || 0) - parseFloat(item.paidAmount || 0)), 0)
        }
      }
    };

    // Validate totals
    const validation = {
      totalMatches: Math.abs(summary.totalAmount - (summary.breakdown.propertyTax.totalAmount + summary.breakdown.waterTax.totalAmount)) < 0.01,
      paidMatches: Math.abs(summary.totalPaid - (summary.breakdown.propertyTax.paidAmount + summary.breakdown.waterTax.paidAmount)) < 0.01,
      balanceMatches: Math.abs(summary.balanceAmount - (summary.breakdown.propertyTax.balanceAmount + summary.breakdown.waterTax.balanceAmount)) < 0.01
    };

    return {
      ...summary,
      validation,
      isValid: Object.values(validation).every(v => v)
    };

  } catch (error) {
    console.error('Failed to get payment distribution summary:', error);
    throw error;
  }
};

/**
 * Validate payment distribution integrity
 * 
 * @param {number} demandId - Demand ID
 * @returns {Promise<Object>} Validation result
 */
export const validatePaymentDistributionIntegrity = async (demandId) => {
  try {
    const summary = await getPaymentDistributionSummary(demandId);
    
    const issues = [];
    
    // No-item demands (SHOP_TAX, D2DC): no item-level validation
    if (summary.noItems) {
      const balance = parseFloat(summary.balanceAmount || 0);
      const paid = parseFloat(summary.paidAmount || 0);
      const total = parseFloat(summary.totalAmount || 0);
      if (balance < -0.01) issues.push('Demand has negative balance');
      if (paid > total + 0.01) issues.push('Demand is overpaid');
      return {
        demandId,
        isValid: issues.length === 0,
        issues,
        summary
      };
    }
    
    if (!summary.isValid) {
      issues.push('Payment distribution totals do not match demand totals');
    }
    
    // Check for negative balances
    const negativeBalances = summary.items.filter(item => item.balanceAmount < -0.01);
    if (negativeBalances.length > 0) {
      issues.push(`${negativeBalances.length} items have negative balances`);
    }
    
    // Check for overpaid items
    const overpaidItems = summary.items.filter(item => item.paidAmount > item.totalAmount + 0.01);
    if (overpaidItems.length > 0) {
      issues.push(`${overpaidItems.length} items are overpaid`);
    }
    
    return {
      demandId,
      isValid: issues.length === 0,
      issues,
      summary
    };
    
  } catch (error) {
    console.error('Payment distribution validation failed:', error);
    throw error;
  }
};
