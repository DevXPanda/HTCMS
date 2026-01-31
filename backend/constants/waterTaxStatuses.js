/**
 * Water Tax Module - Status Constants
 * 
 * This file contains all status enums and constants for the Water Tax module.
 * Use these constants instead of hardcoded strings to ensure consistency.
 */

/**
 * Water Connection Statuses
 * 
 * Valid transitions:
 * - DRAFT → ACTIVE (when connection is activated)
 * - ACTIVE → DISCONNECTED (when connection is disconnected)
 * - DISCONNECTED → ACTIVE (when connection is reconnected)
 */
export const WATER_CONNECTION_STATUS = {
  DRAFT: 'DRAFT',           // Connection is being set up (not yet active)
  ACTIVE: 'ACTIVE',         // Connection is active and can receive bills
  DISCONNECTED: 'DISCONNECTED' // Connection has been disconnected
};

/**
 * Water Bill Statuses
 * 
 * Valid transitions:
 * - pending → partially_paid (when exactly 50% payment is made)
 * - pending → paid (when full payment is made)
 * - pending → overdue (when due date passes - automatic via cron)
 * - partially_paid → paid (when remaining balance is paid)
 * - partially_paid → overdue (when due date passes - automatic via cron)
 * - overdue → partially_paid (when exactly 50% payment is made on overdue bill)
 * - overdue → paid (when full payment is made on overdue bill)
 * - Any status → cancelled (when bill is cancelled - manual action)
 */
export const WATER_BILL_STATUS = {
  PENDING: 'pending',           // Bill is unpaid and not yet overdue
  PARTIALLY_PAID: 'partially_paid', // Exactly 50% payment has been made
  PAID: 'paid',                 // Bill is fully paid
  OVERDUE: 'overdue',           // Bill is past due date (automatic via cron)
  CANCELLED: 'cancelled'        // Bill has been cancelled (manual action)
};

/**
 * Water Payment Statuses
 * 
 * Valid transitions:
 * - pending → completed (when payment is processed successfully)
 * - pending → failed (when payment processing fails)
 * - pending → cancelled (when payment is cancelled)
 * - failed → completed (when failed payment is retried and succeeds)
 * 
 * Note: Currently, payments are set to 'completed' immediately upon creation.
 * The 'pending', 'failed', and 'cancelled' statuses are reserved for future
 * online payment integration where payment processing may be asynchronous.
 */
export const WATER_PAYMENT_STATUS = {
  PENDING: 'pending',     // Payment is being processed (for async payments)
  COMPLETED: 'completed', // Payment has been successfully processed
  FAILED: 'failed',       // Payment processing failed (for async payments)
  CANCELLED: 'cancelled'  // Payment was cancelled
};

/**
 * Water Meter Reading Types
 * 
 * Note: This is not a status, but a type classification for readings.
 */
export const WATER_METER_READING_TYPE = {
  ACTUAL: 'actual',       // Actual meter reading taken on-site
  ESTIMATED: 'estimated', // Estimated reading (when meter not accessible)
  CORRECTED: 'corrected'  // Corrected reading (after error correction)
};

/**
 * Helper functions to check status groups
 */

/**
 * Check if a bill status indicates the bill is unpaid
 * @param {string} status - Bill status
 * @returns {boolean}
 */
export const isUnpaidBillStatus = (status) => {
  return [
    WATER_BILL_STATUS.PENDING,
    WATER_BILL_STATUS.PARTIALLY_PAID,
    WATER_BILL_STATUS.OVERDUE
  ].includes(status);
};

/**
 * Get all unpaid bill statuses as an array
 * @returns {string[]}
 */
export const getUnpaidBillStatuses = () => {
  return [
    WATER_BILL_STATUS.PENDING,
    WATER_BILL_STATUS.PARTIALLY_PAID,
    WATER_BILL_STATUS.OVERDUE
  ];
};

/**
 * Check if a connection status allows bill generation
 * @param {string} status - Connection status
 * @returns {boolean}
 */
export const canGenerateBillForConnection = (status) => {
  return status === WATER_CONNECTION_STATUS.ACTIVE;
};

/**
 * Check if a payment status indicates successful payment
 * @param {string} status - Payment status
 * @returns {boolean}
 */
export const isSuccessfulPaymentStatus = (status) => {
  return status === WATER_PAYMENT_STATUS.COMPLETED;
};

/**
 * Get all status values as arrays (for use in Sequelize queries)
 */
export const WATER_CONNECTION_STATUSES = Object.values(WATER_CONNECTION_STATUS);
export const WATER_BILL_STATUSES = Object.values(WATER_BILL_STATUS);
export const WATER_PAYMENT_STATUSES = Object.values(WATER_PAYMENT_STATUS);
export const WATER_METER_READING_TYPES = Object.values(WATER_METER_READING_TYPE);
