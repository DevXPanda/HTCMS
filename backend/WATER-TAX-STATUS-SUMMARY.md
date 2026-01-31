# Water Tax Module - Status Standardization Summary

## Overview
All status values in the Water Tax module have been standardized using constants defined in `backend/constants/waterTaxStatuses.js`.

## Status Definitions

### 1. Water Connection Statuses
- **DRAFT**: Connection is being set up (not yet active)
- **ACTIVE**: Connection is active and can receive bills ✅ (Used)
- **DISCONNECTED**: Connection has been disconnected

**Valid Transitions:**
- DRAFT → ACTIVE (when connection is activated)
- ACTIVE → DISCONNECTED (when connection is disconnected)
- DISCONNECTED → ACTIVE (when connection is reconnected)

**Note:** DRAFT and DISCONNECTED are defined but not currently used in code. They are kept for future functionality.

### 2. Water Bill Statuses
- **pending**: Bill is unpaid and not yet overdue ✅ (Default, Used)
- **partially_paid**: Partial payment has been made ✅ (Used)
- **paid**: Bill is fully paid ✅ (Used)
- **overdue**: Bill is past due date ✅ (Used in queries)
- **cancelled**: Bill has been cancelled

**Valid Transitions:**
- pending → partially_paid (when partial payment is made)
- pending → paid (when full payment is made)
- pending → overdue (when due date passes - automatic via cron)
- partially_paid → paid (when remaining balance is paid)
- partially_paid → overdue (when due date passes - automatic via cron)
- overdue → partially_paid (when partial payment is made on overdue bill)
- overdue → paid (when full payment is made on overdue bill)
- Any status → cancelled (when bill is cancelled - manual action)

**Note:** 'overdue' status should be automatically set via a cron job when due date passes. 'cancelled' is defined but not currently used.

### 3. Water Payment Statuses
- **pending**: Payment is being processed (for async payments)
- **completed**: Payment has been successfully processed ✅ (Used)
- **failed**: Payment processing failed (for async payments)
- **cancelled**: Payment was cancelled

**Valid Transitions:**
- pending → completed (when payment is processed successfully)
- pending → failed (when payment processing fails)
- pending → cancelled (when payment is cancelled)
- failed → completed (when failed payment is retried and succeeds)

**Note:** Currently, payments are set to 'completed' immediately upon creation. The 'pending', 'failed', and 'cancelled' statuses are reserved for future online payment integration where payment processing may be asynchronous.

### 4. Water Meter Reading Types
- **actual**: Actual meter reading taken on-site ✅ (Default, Used)
- **estimated**: Estimated reading (when meter not accessible) ✅ (Used)
- **corrected**: Corrected reading (after error correction) ✅ (Used)

**Note:** This is not a status field, but a type classification for readings.

## Changes Made

### 1. Created Constants File
- **File**: `backend/constants/waterTaxStatuses.js`
- Contains all status enums and helper functions
- Provides centralized status management

### 2. Updated Controllers
All controllers now use status constants instead of hardcoded strings:
- ✅ `waterConnection.controller.js`
- ✅ `waterBill.controller.js`
- ✅ `waterPayment.controller.js`
- ✅ `waterDashboard.controller.js`
- ✅ `waterMeterReading.controller.js` (for reading types)

### 3. Helper Functions
Created utility functions for common status checks:
- `isUnpaidBillStatus(status)` - Check if bill is unpaid
- `getUnpaidBillStatuses()` - Get array of unpaid bill statuses
- `canGenerateBillForConnection(status)` - Check if connection allows bill generation
- `isSuccessfulPaymentStatus(status)` - Check if payment was successful

## Status Usage Summary

| Status | Model | Currently Used | Future Use |
|--------|-------|----------------|------------|
| DRAFT | WaterConnection | ❌ | ✅ For draft connections |
| ACTIVE | WaterConnection | ✅ | ✅ |
| DISCONNECTED | WaterConnection | ❌ | ✅ For disconnected connections |
| pending | WaterBill | ✅ | ✅ |
| partially_paid | WaterBill | ✅ | ✅ |
| paid | WaterBill | ✅ | ✅ |
| overdue | WaterBill | ✅ | ✅ (needs cron job) |
| cancelled | WaterBill | ❌ | ✅ For cancelled bills |
| pending | WaterPayment | ❌ | ✅ For async payments |
| completed | WaterPayment | ✅ | ✅ |
| failed | WaterPayment | ❌ | ✅ For failed payments |
| cancelled | WaterPayment | ❌ | ✅ For cancelled payments |

## Recommendations

1. **Implement Overdue Status Automation**: Create a cron job to automatically update bill status to 'overdue' when due date passes.

2. **Future Payment Status Handling**: When implementing online payments, use 'pending' status initially, then update to 'completed' or 'failed' based on payment gateway response.

3. **Connection Status Management**: Implement endpoints to:
   - Activate DRAFT connections (DRAFT → ACTIVE)
   - Disconnect ACTIVE connections (ACTIVE → DISCONNECTED)
   - Reconnect DISCONNECTED connections (DISCONNECTED → ACTIVE)

4. **Bill Cancellation**: Implement functionality to cancel bills (any status → cancelled) with proper validation.

## Files Modified

1. ✅ `backend/constants/waterTaxStatuses.js` (NEW)
2. ✅ `backend/controllers/waterConnection.controller.js`
3. ✅ `backend/controllers/waterBill.controller.js`
4. ✅ `backend/controllers/waterPayment.controller.js`
5. ✅ `backend/controllers/waterDashboard.controller.js`
6. ✅ `backend/controllers/waterMeterReading.controller.js`

## Database Schema

The database schema (SQL migration) already has the correct status enums defined. No changes needed to:
- `backend/scripts/migrate-water-tax-schema.sql`

## Testing Recommendations

1. Test all status transitions are working correctly
2. Verify unpaid bill queries return correct results
3. Test payment status updates
4. Verify connection status validation for bill generation
