/**
 * Converts a value to a number, defaulting to 0 if invalid.
 * @param {any} n 
 * @returns {number}
 */
export const toNumber = (n) => Number(n || 0);

/**
 * Formats a number using the Indian numbering system with compact suffixes (Cr, L, K).
 * Example: 890132887.23 -> 89.01 Cr
 * @param {number|string} value 
 * @returns {string}
 */
export const formatIndianCompact = (value) => {
  const num = toNumber(value);
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);

  if (absNum >= 10000000) {
    return `${sign}${(absNum / 10000000).toFixed(2)} Cr`;
  }
  if (absNum >= 100000) {
    return `${sign}${(absNum / 100000).toFixed(2)} L`;
  }
  if (absNum >= 1000) {
    return `${sign}${(absNum / 1000).toFixed(2)} K`;
  }
  
  return sign + absNum.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
};

/**
 * Formats a value as Indian currency with compact suffixes.
 * @param {number|string} value 
 * @returns {string}
 */
export const formatCurrencyCr = (value) => {
  const formatted = formatIndianCompact(value);
  // If the formatted string already contains Cr, L, or K, it's already compact
  // If it's a negative sign, we should place the currency symbol carefully
  if (formatted.startsWith('-')) {
    return `-₹${formatted.substring(1)}`;
  }
  return `₹${formatted}`;
};
