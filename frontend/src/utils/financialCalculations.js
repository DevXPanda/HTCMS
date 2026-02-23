/**
 * Centralized financial calculation for Discount and Penalty Waiver (mirrors backend).
 * All monetary values rounded to 2 decimal places. UI preview must use same formula as backend.
 */

export function round2(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  return Number((Math.round(n * 100) / 100).toFixed(2));
}

/**
 * Original amount (tax only) = totalAmount - penaltyAmount - interestAmount
 */
export function getDemandOriginalAmount(demand) {
  const total = parseFloat(demand?.totalAmount) || 0;
  const penalty = parseFloat(demand?.penaltyAmount) || 0;
  const interest = parseFloat(demand?.interestAmount) || 0;
  return round2(total - penalty - interest);
}

/**
 * Total penalty amount = penaltyAmount + interestAmount
 */
export function getDemandPenaltyAmount(demand) {
  const penalty = parseFloat(demand?.penaltyAmount) || 0;
  const interest = parseFloat(demand?.interestAmount) || 0;
  return round2(penalty + interest);
}

/**
 * Calculate discount amount. Returns { discountAmount, error? }.
 */
export function calculateDiscount(originalAmount, discountType, discountValue) {
  const original = round2(originalAmount);
  const value = parseFloat(discountValue);
  if (Number.isNaN(value) || value < 0) {
    return { discountAmount: 0, error: 'Invalid discount value' };
  }
  if (discountType === 'PERCENTAGE') {
    if (value > 100) return { discountAmount: 0, error: 'Percentage cannot exceed 100' };
    const discountAmount = round2((original * value) / 100);
    if (discountAmount < 0) return { discountAmount: 0, error: 'Discount amount must be >= 0' };
    if (discountAmount > original) return { discountAmount: 0, error: 'Discount cannot exceed original amount' };
    return { discountAmount };
  }
  const discountAmount = round2(value);
  if (discountAmount < 0) return { discountAmount: 0, error: 'Discount amount must be >= 0' };
  if (discountAmount > original) return { discountAmount: 0, error: 'Discount cannot exceed original amount' };
  return { discountAmount };
}

/**
 * Calculate penalty waiver. Returns { waiverAmount, remainingPenalty, error? }.
 */
export function calculatePenaltyWaiver(penaltyAmount, waiverType, waiverValue) {
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
 * Master formula: finalAmount = originalAmount - discountAmount + remainingPenalty
 * options: { discountAmount, waiverAmount } (default 0)
 */
export function calculateFinalAmount(demand, options = {}) {
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
