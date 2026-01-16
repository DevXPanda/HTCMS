import { Demand, PenaltyRule } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Penalty Calculation Service
 * Handles all penalty and interest calculations based on configurable rules
 */

/**
 * Safely convert value to number, handling string decimals
 */
const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Safely round to 2 decimal places for monetary values
 */
const roundMoney = (value) => {
  const num = toNumber(value);
  return Math.round(num * 100) / 100;
};

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

  // Determine base amount for penalty calculation - ensure numeric conversion
  let penaltyBase = 0;
  switch (rule.penaltyBase) {
    case 'base_amount':
      penaltyBase = toNumber(demand.baseAmount);
      break;
    case 'total_amount':
      penaltyBase = toNumber(demand.baseAmount) + toNumber(demand.arrearsAmount);
      break;
    case 'balance_amount':
      penaltyBase = toNumber(demand.balanceAmount);
      break;
    default:
      penaltyBase = toNumber(demand.baseAmount);
  }

  if (penaltyBase <= 0) {
    return 0;
  }

  let penalty = 0;
  const penaltyValue = toNumber(rule.penaltyValue);

  if (rule.penaltyType === 'flat') {
    // Flat penalty
    if (rule.penaltyFrequency === 'one_time') {
      penalty = penaltyValue;
    } else if (rule.penaltyFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      penalty = penaltyValue * months;
    } else if (rule.penaltyFrequency === 'daily') {
      penalty = penaltyValue * overdueDays;
    }
  } else if (rule.penaltyType === 'percentage') {
    // Percentage-based penalty
    if (rule.penaltyFrequency === 'one_time') {
      penalty = (penaltyBase * penaltyValue) / 100;
    } else if (rule.penaltyFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      penalty = (penaltyBase * penaltyValue * months) / 100;
    } else if (rule.penaltyFrequency === 'daily') {
      penalty = (penaltyBase * penaltyValue * overdueDays) / 100;
    }
  }

  // Apply maximum cap if set
  const maxPenalty = toNumber(rule.maxPenaltyAmount);
  if (maxPenalty > 0 && penalty > maxPenalty) {
    penalty = maxPenalty;
  }

  return roundMoney(penalty);
};

/**
 * Calculate interest amount based on rule
 */
export const calculateInterest = (demand, rule, overdueDays) => {
  if (!rule || rule.interestType === 'none' || overdueDays <= 0) {
    return 0;
  }

  // Determine base amount for interest calculation - ensure numeric conversion
  let interestBase = 0;
  switch (rule.interestBase) {
    case 'base_amount':
      interestBase = toNumber(demand.baseAmount);
      break;
    case 'total_amount':
      interestBase = toNumber(demand.baseAmount) + toNumber(demand.arrearsAmount);
      break;
    case 'balance_amount':
      interestBase = toNumber(demand.balanceAmount);
      break;
    default:
      interestBase = toNumber(demand.balanceAmount);
  }

  if (interestBase <= 0) {
    return 0;
  }

  let interest = 0;
  const interestValue = toNumber(rule.interestValue);

  if (rule.interestType === 'flat') {
    // Flat interest
    if (rule.interestFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      interest = interestValue * months;
    } else if (rule.interestFrequency === 'daily') {
      interest = interestValue * overdueDays;
    }
  } else if (rule.interestType === 'percentage') {
    // Percentage-based interest
    if (rule.interestFrequency === 'monthly') {
      const months = Math.ceil(overdueDays / 30);
      interest = (interestBase * interestValue * months) / 100;
    } else if (rule.interestFrequency === 'daily') {
      interest = (interestBase * interestValue * overdueDays) / 100;
    }
  }

  // Apply maximum cap if set
  const maxInterest = toNumber(rule.maxInterestAmount);
  if (maxInterest > 0 && interest > maxInterest) {
    interest = maxInterest;
  }

  return roundMoney(interest);
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

  // If balance is zero, don't apply penalty - ensure numeric comparison
  if (toNumber(demand.balanceAmount) <= 0) {
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
  if (rule.penaltyFrequency === 'one_time' && toNumber(demand.penaltyAmount) > 0) {
    return false; // Already applied
  }

  return true;
};

/**
 * Apply penalty and interest to a demand
 */
export const applyPenaltyToDemand = async (demand, rule, overdueDays) => {
  // Safely convert all values to numbers
  const previousPenaltyAmount = roundMoney(demand.penaltyAmount);
  const previousInterestAmount = roundMoney(demand.interestAmount);
  const previousTotalAmount = roundMoney(demand.totalAmount);
  const previousBalanceAmount = roundMoney(demand.balanceAmount);
  const baseAmount = roundMoney(demand.baseAmount);
  const arrearsAmount = roundMoney(demand.arrearsAmount);
  const paidAmount = roundMoney(demand.paidAmount);

  // Calculate new penalty and interest (already returns numbers)
  const newPenalty = roundMoney(calculatePenalty(demand, rule, overdueDays));
  const newInterest = roundMoney(calculateInterest(demand, rule, overdueDays));

  // Calculate total amount using proper numeric arithmetic
  const totalAmount = roundMoney(baseAmount + arrearsAmount + newPenalty + newInterest);
  const balanceAmount = roundMoney(totalAmount - paidAmount);

  // Update demand amounts - ensure all values are proper numbers
  demand.penaltyAmount = newPenalty;
  demand.interestAmount = newInterest;
  demand.totalAmount = totalAmount;
  demand.balanceAmount = balanceAmount;
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

  // Ensure return values are numbers, not strings
  return {
    previousPenaltyAmount: roundMoney(previousPenaltyAmount),
    previousInterestAmount: roundMoney(previousInterestAmount),
    previousTotalAmount: roundMoney(previousTotalAmount),
    previousBalanceAmount: roundMoney(previousBalanceAmount),
    newPenalty: roundMoney(newPenalty),
    newInterest: roundMoney(newInterest),
    newTotalAmount: roundMoney(totalAmount),
    newBalanceAmount: roundMoney(balanceAmount),
    penaltyAdded: roundMoney(newPenalty - previousPenaltyAmount),
    interestAdded: roundMoney(newInterest - previousInterestAmount)
  };
};
