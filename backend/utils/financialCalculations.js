/**
 * Centralized financial calculation for Discount and Penalty Waiver.
 * All monetary values rounded to 2 decimal places. Used by backend and must match frontend.
 */

/**
 * Round to 2 decimal places (avoid floating point errors).
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  return Number((Math.round(n * 100) / 100).toFixed(2));
}

/**
 * Get original amount (tax only: base + arrears) from demand.
 * original_amount = totalAmount - penaltyAmount - interestAmount
 * @param {object} demand - demand with totalAmount, penaltyAmount, interestAmount
 * @returns {number}
 */
function getDemandOriginalAmount(demand) {
  const total = parseFloat(demand?.totalAmount) || 0;
  const penalty = parseFloat(demand?.penaltyAmount) || 0;
  const interest = parseFloat(demand?.interestAmount) || 0;
  return round2(total - penalty - interest);
}

/**
 * Get total penalty amount (penalty + interest) from demand.
 * @param {object} demand
 * @returns {number}
 */
function getDemandPenaltyAmount(demand) {
  const penalty = parseFloat(demand?.penaltyAmount) || 0;
  const interest = parseFloat(demand?.interestAmount) || 0;
  return round2(penalty + interest);
}

/**
 * Calculate discount amount from original amount.
 * PERCENTAGE: discount_amount = (original_amount * discount_value) / 100
 * FIXED: discount_amount = discount_value
 * Validation: discount_amount >= 0, discount_amount cannot exceed original_amount.
 * If discount_type = 'PERCENTAGE' and value > 100 → caller should reject.
 *
 * @param {number} originalAmount
 * @param {string} discountType - 'PERCENTAGE' | 'FIXED'
 * @param {number} discountValue
 * @returns {{ discountAmount: number, error?: string }}
 */
function calculateDiscount(originalAmount, discountType, discountValue) {
  const original = round2(originalAmount);
  const value = parseFloat(discountValue);
  if (Number.isNaN(value) || value < 0) {
    return { discountAmount: 0, error: 'Invalid discount value' };
  }
  if (discountType === 'PERCENTAGE') {
    if (value > 100) return { discountAmount: 0, error: 'Percentage cannot exceed 100' };
    const discountAmount = round2((original * value) / 100);
    if (discountAmount < 0) return { discountAmount: 0, error: 'Discount amount must be >= 0' };
    if (discountAmount > original) return { discountAmount: round2(original), error: 'Discount cannot exceed original amount' };
    return { discountAmount };
  }
  const discountAmount = round2(value);
  if (discountAmount < 0) return { discountAmount: 0, error: 'Discount amount must be >= 0' };
  if (discountAmount > original) return { discountAmount: 0, error: 'Discount cannot exceed original amount' };
  return { discountAmount };
}

/**
 * Calculate penalty waiver amount and remaining penalty.
 * PERCENTAGE: waiver_amount = (penalty_amount * waiver_value) / 100
 * FIXED: waiver_amount = waiver_value
 * remaining_penalty = round(penalty_amount - waiver_amount, 2)
 * Validation: waiver_amount >= 0, waiver_amount cannot exceed penalty_amount.
 * If waiver_type = 'PERCENTAGE' and value > 100 → caller should reject.
 *
 * @param {number} penaltyAmount
 * @param {string} waiverType - 'PERCENTAGE' | 'FIXED'
 * @param {number} waiverValue
 * @returns {{ waiverAmount: number, remainingPenalty: number, error?: string }}
 */
function calculatePenaltyWaiver(penaltyAmount, waiverType, waiverValue) {
  const penalty = round2(penaltyAmount);
  const value = parseFloat(waiverValue);
  if (Number.isNaN(value) || value < 0) {
    return { waiverAmount: 0, remainingPenalty: penalty, error: 'Invalid waiver value' };
  }
  if (waiverType === 'PERCENTAGE') {
    if (value > 100) return { waiverAmount: 0, remainingPenalty: penalty, error: 'Percentage cannot exceed 100' };
    const waiverAmount = round2((penalty * value) / 100);
    if (waiverAmount < 0) return { waiverAmount: 0, remainingPenalty: penalty, error: 'Waiver amount must be >= 0' };
    if (waiverAmount > penalty) return { waiverAmount: 0, remainingPenalty: penalty, error: 'Waiver cannot exceed penalty amount' };
    const remainingPenalty = round2(penalty - waiverAmount);
    return { waiverAmount, remainingPenalty };
  }
  const waiverAmount = round2(value);
  if (waiverAmount < 0) return { waiverAmount: 0, remainingPenalty: penalty, error: 'Waiver amount must be >= 0' };
  if (waiverAmount > penalty) return { waiverAmount: 0, remainingPenalty: penalty, error: 'Waiver cannot exceed penalty amount' };
  const remainingPenalty = round2(penalty - waiverAmount);
  return { waiverAmount, remainingPenalty };
}

/**
 * Master formula: final_amount = original_amount - discount_amount + remaining_penalty
 * where remaining_penalty = penalty_amount - penalty_waived.
 * Discount and penalty waiver are kept separate; never subtract waiver from original tax.
 *
 * @param {object} demand - demand with totalAmount, penaltyAmount, interestAmount, penaltyWaived
 * @param {object} options - { discountAmount: number, waiverAmount: number } (default 0)
 * @returns {{ discountAmount: number, waiverAmount: number, remainingPenalty: number, finalAmount: number, originalAmount: number, penaltyAmount: number }}
 */
function calculateFinalAmount(demand, options = {}) {
  const originalAmount = getDemandOriginalAmount(demand);
  const penaltyAmount = getDemandPenaltyAmount(demand);
  const discountAmount = round2(options.discountAmount ?? 0);
  const waiverAmount = round2(options.waiverAmount ?? parseFloat(demand?.penaltyWaived) ?? 0);
  const remainingPenalty = round2(penaltyAmount - waiverAmount);
  const finalAmount = round2(originalAmount - discountAmount + remainingPenalty);
  return {
    originalAmount,
    penaltyAmount,
    discountAmount,
    waiverAmount,
    remainingPenalty,
    finalAmount
  };
}

export {
  round2,
  getDemandOriginalAmount,
  getDemandPenaltyAmount,
  calculateDiscount,
  calculatePenaltyWaiver,
  calculateFinalAmount
};
