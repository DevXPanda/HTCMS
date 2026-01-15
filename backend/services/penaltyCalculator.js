import { Demand, PenaltyRule } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Penalty Calculation Service
 * Handles all penalty and interest calculations based on configurable rules
 */

/**
 * Get active penalty rule for a financial year
 */
export const getActivePenaltyRule = async (financialYear) => {
  const today = new Date();
  
  // First try to get rule for specific financial year
  let rule = await PenaltyRule.findOne({
    where: {
      financialYear,
      isActive: true,
      effectiveFrom: { [Op.lte]: today },
      [Op.or]: [
        { effectiveTo: null },
        { effectiveTo: { [Op.gte]: today } }
      ]
    },
    order: [['effectiveFrom', 'DESC']]
  });

  // If no specific rule, try to get "ALL" rule
  if (!rule) {
    rule = await PenaltyRule.findOne({
      where: {
        financialYear: 'ALL',
        isActive: true,
        effectiveFrom: { [Op.lte]: today },
        [Op.or]: [
          { effectiveTo: null },
          { effectiveTo: { [Op.gte]: today } }
        ]
      },
      order: [['effectiveFrom', 'DESC']]
    });
  }

  return rule;
};

/**
 * Calculate days overdue
 */
export const calculateOverdueDays = (dueDate, gracePeriodDays = 0) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysDiff - gracePeriodDays);
};

/**
 * Calculate penalty amount based on rule
 */
export const calculatePenalty = (demand, rule, overdueDays) => {
  if (!rule || rule.penaltyType === 'none' || overdueDays <= 0) {
    return 0;
  }

  // Determine base amount for penalty calculation
  let penaltyBase = 0;
  switch (rule.penaltyBase) {
    case 'base_amount':
      penaltyBase = parseFloat(demand.baseAmount || 0);
      break;
    case 'total_amount':
      penaltyBase = parseFloat(demand.baseAmount || 0) + parseFloat(demand.arrearsAmount || 0);
      break;
    case 'balance_amount':
      penaltyBase = parseFloat(demand.balanceAmount || 0);
      break;
    default:
      penaltyBase = parseFloat(demand.baseAmount || 0);
  }

  if (penaltyBase <= 0) {
    return 0;
  }

  let penalty = 0;

  if (rule.penaltyType === 'flat') {
    // Flat penalty
    if (rule.penaltyFrequency === 'one_time') {
      penalty = parseFloat(rule.penaltyValue || 0);
    } else if (rule.penaltyFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      penalty = parseFloat(rule.penaltyValue || 0) * months;
    } else if (rule.penaltyFrequency === 'daily') {
      penalty = parseFloat(rule.penaltyValue || 0) * overdueDays;
    }
  } else if (rule.penaltyType === 'percentage') {
    // Percentage-based penalty
    if (rule.penaltyFrequency === 'one_time') {
      penalty = (penaltyBase * parseFloat(rule.penaltyValue || 0)) / 100;
    } else if (rule.penaltyFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      penalty = (penaltyBase * parseFloat(rule.penaltyValue || 0) * months) / 100;
    } else if (rule.penaltyFrequency === 'daily') {
      penalty = (penaltyBase * parseFloat(rule.penaltyValue || 0) * overdueDays) / 100;
    }
  }

  // Apply maximum cap if set
  if (rule.maxPenaltyAmount && penalty > parseFloat(rule.maxPenaltyAmount)) {
    penalty = parseFloat(rule.maxPenaltyAmount);
  }

  return Math.round(penalty * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate interest amount based on rule
 */
export const calculateInterest = (demand, rule, overdueDays) => {
  if (!rule || rule.interestType === 'none' || overdueDays <= 0) {
    return 0;
  }

  // Determine base amount for interest calculation
  let interestBase = 0;
  switch (rule.interestBase) {
    case 'base_amount':
      interestBase = parseFloat(demand.baseAmount || 0);
      break;
    case 'total_amount':
      interestBase = parseFloat(demand.baseAmount || 0) + parseFloat(demand.arrearsAmount || 0);
      break;
    case 'balance_amount':
      interestBase = parseFloat(demand.balanceAmount || 0);
      break;
    default:
      interestBase = parseFloat(demand.balanceAmount || 0);
  }

  if (interestBase <= 0) {
    return 0;
  }

  let interest = 0;

  if (rule.interestType === 'flat') {
    // Flat interest
    if (rule.interestFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      interest = parseFloat(rule.interestValue || 0) * months;
    } else if (rule.interestFrequency === 'daily') {
      interest = parseFloat(rule.interestValue || 0) * overdueDays;
    }
  } else if (rule.interestType === 'percentage') {
    // Percentage-based interest
    if (rule.interestFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      interest = (interestBase * parseFloat(rule.interestValue || 0) * months) / 100;
    } else if (rule.interestFrequency === 'daily') {
      interest = (interestBase * parseFloat(rule.interestValue || 0) * overdueDays) / 100;
    }
  }

  // Apply maximum cap if set
  if (rule.maxInterestAmount && interest > parseFloat(rule.maxInterestAmount)) {
    interest = parseFloat(rule.maxInterestAmount);
  }

  return Math.round(interest * 100) / 100; // Round to 2 decimal places
};

/**
 * Check if penalty should be applied (prevent duplicates)
 */
export const shouldApplyPenalty = (demand, rule, overdueDays) => {
  if (!rule || overdueDays <= 0) {
    return false;
  }

  // If demand is paid or cancelled, don't apply penalty
  if (demand.status === 'paid' || demand.status === 'cancelled') {
    return false;
  }

  // If balance is zero, don't apply penalty
  if (parseFloat(demand.balanceAmount || 0) <= 0) {
    return false;
  }

  // Check if penalty was already applied today (for daily frequency)
  if (rule.penaltyFrequency === 'daily' && demand.lastPenaltyAppliedAt) {
    const lastApplied = new Date(demand.lastPenaltyAppliedAt);
    const today = new Date();
    lastApplied.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (lastApplied.getTime() === today.getTime()) {
      return false; // Already applied today
    }
  }

  // Check if penalty was already applied this month (for monthly frequency)
  if (rule.penaltyFrequency === 'monthly' && demand.lastPenaltyAppliedAt) {
    const lastApplied = new Date(demand.lastPenaltyAppliedAt);
    const today = new Date();
    
    if (lastApplied.getFullYear() === today.getFullYear() &&
        lastApplied.getMonth() === today.getMonth()) {
      return false; // Already applied this month
    }
  }

  // For one_time penalty, check if it was already applied
  if (rule.penaltyFrequency === 'one_time' && parseFloat(demand.penaltyAmount || 0) > 0) {
    return false; // Already applied
  }

  return true;
};

/**
 * Apply penalty and interest to a demand
 */
export const applyPenaltyToDemand = async (demand, rule, overdueDays) => {
  const previousPenaltyAmount = parseFloat(demand.penaltyAmount || 0);
  const previousInterestAmount = parseFloat(demand.interestAmount || 0);
  const previousTotalAmount = parseFloat(demand.totalAmount || 0);
  const previousBalanceAmount = parseFloat(demand.balanceAmount || 0);

  // Calculate new penalty and interest
  const newPenalty = calculatePenalty(demand, rule, overdueDays);
  const newInterest = calculateInterest(demand, rule, overdueDays);

  // Update demand amounts
  demand.penaltyAmount = newPenalty;
  demand.interestAmount = newInterest;
  demand.totalAmount = parseFloat(demand.baseAmount || 0) + 
                       parseFloat(demand.arrearsAmount || 0) + 
                       newPenalty + 
                       newInterest;
  demand.balanceAmount = demand.totalAmount - parseFloat(demand.paidAmount || 0);
  demand.overdueDays = overdueDays;
  demand.lastPenaltyAppliedAt = new Date();

  // Update status to overdue if not already
  if (demand.status === 'pending' && overdueDays > 0) {
    demand.status = 'overdue';
  }

  // Update penalty breakdown history
  const breakdown = demand.penaltyBreakdown || [];
  breakdown.push({
    date: new Date().toISOString(),
    overdueDays,
    penalty: newPenalty - previousPenaltyAmount,
    interest: newInterest - previousInterestAmount,
    totalPenalty: newPenalty,
    totalInterest: newInterest,
    reason: `Auto-applied via cron job (Rule: ${rule.ruleName})`
  });
  demand.penaltyBreakdown = breakdown;

  await demand.save();

  return {
    previousPenaltyAmount,
    previousInterestAmount,
    previousTotalAmount,
    previousBalanceAmount,
    newPenalty,
    newInterest,
    newTotalAmount: demand.totalAmount,
    newBalanceAmount: demand.balanceAmount,
    penaltyAdded: newPenalty - previousPenaltyAmount,
    interestAdded: newInterest - previousInterestAmount
  };
};
