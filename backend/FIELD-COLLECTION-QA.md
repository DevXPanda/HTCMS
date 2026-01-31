# Field Collection Functionality - QA Testing Guide

## Overview
This document provides comprehensive QA testing procedures for the newly implemented Field Collection functionality in the HTCMS Collector Portal.

## Features Implemented

### 1. Tax Summary Module
- **Location**: Collector Sidebar → Tax Summary
- **Purpose**: Display unified tax demands for field collection
- **Access**: Collector, Tax Collector roles

### 2. Payment Collection Flow
- **Payment Modes**: Cash, Cheque, Card, Online
- **Proof Upload**: Mandatory for offline payments
- **Validation**: Overpayment protection, partial payment support

### 3. Database Enhancements
- **New Columns**: `proofUrl`, `collectedBy`, `accountHolderName` in payments table
- **Foreign Keys**: Proper relationships maintained  
- **Audit Trail**: Comprehensive logging
- **Fixed Issues**: Assessment ID validation for unified demands, propertyId object handling, audit log enum errors

### 4. Bug Fixes Applied
- **✅ Fixed**: Assessment ID validation for unified demands
- **✅ Fixed**: propertyId object issue in query parameters
- **✅ Fixed**: Audit log enum validation errors
- **✅ Fixed**: Demand items creation for unified demands
- **✅ Fixed**: Payment distribution validation
- **✅ Fixed**: Removed partially_paid status - now only uses 'pending' and 'paid'
- **✅ Fixed**: Payment status logic for decimal amounts
- **✅ Fixed**: partially_paid now only shows for exactly 50% payments (49%-51% range)

---

## Pre-Testing Requirements

### 1. Database Setup
✅ **Completed**: Run migration scripts
```bash
# Payment proof columns
node backend/scripts/run-migration.js

# Account holder name column  
node backend/scripts/run-account-holder-name-migration.js
```

### 2. Test Data
✅ **Verified**: Unified demands exist in database
- Collector ID: 3 (roshan singh)
- Assigned Ward: Ward 23 (Central Park)
- Unified Demands: 3 with valid assessment IDs
- **Fixed**: Assessment ID validation issues resolved
- Unified Demands: 2 (₹3.62 crore total)

### 3. User Roles
✅ **Required**: Test with collector/tax_collector roles
- Email: ro@gmail.com
- Role: collector

---

## QA Test Cases

### 🎯 Module 1: Tax Summary Page

#### Test Case 1.1: Page Access
**Objective**: Verify Tax Summary page loads correctly
**Steps**:
1. Login as collector (ro@gmail.com)
2. Navigate to Collector Portal
3. Click on "Tax Summary" in sidebar
**Expected Result**:
- ✅ Page loads without errors
- ✅ Title: "Tax Summary"
- ✅ Subtitle: "Unified tax demands for field collection"

#### Test Case 1.2: Data Display
**Objective**: Verify unified demands are displayed
**Steps**:
1. Access Tax Summary page
2. Check demand data
**Expected Result**:
- ✅ Shows 2 unified demands
- ✅ Property details displayed
- ✅ Owner information shown
- ✅ Balance amounts correct
- ✅ Status indicators working

#### Test Case 1.3: Filters Functionality
**Objective**: Test all filter options
**Steps**:
1. Test Ward filter
2. Test Status filter
3. Test Due Date filter
4. Test Search functionality
**Expected Result**:
- ✅ Filters work correctly
- ✅ Data updates dynamically
- ✅ Clear filters button works

---

### 💳 Module 2: Payment Collection

#### Test Case 2.1: Payment Modal
**Objective**: Verify payment collection modal
**Steps**:
1. Click "Collect" button on any demand
2. Verify modal opens
3. Check form fields
**Expected Result**:
- ✅ Modal opens with demand details
- ✅ Amount pre-filled with balance
- ✅ Payment mode options available
- ✅ Form validation working

#### Test Case 2.2: Cash Payment
**Objective**: Test cash payment collection
**Steps**:
1. Select "Cash" payment mode
2. Enter amount (≤ balance)
3. Upload proof document
4. Submit payment
**Expected Result**:
- ✅ Payment processed successfully
- ✅ Receipt generated
- ✅ Demand balance updated
- ✅ Status changed appropriately

#### Test Case 2.3: Cheque Payment
**Objective**: Test cheque payment collection
**Steps**:
1. Select "Cheque" payment mode
2. Fill cheque details (number, date, bank)
3. Upload proof document
4. Submit payment
**Expected Result**:
- ✅ Cheque details validated
- ✅ Payment processed
- ✅ All cheque data saved correctly

#### Test Case 2.4: Card Payment
**Objective**: Test card payment collection
**Steps**:
1. Select "Card" payment mode
2. Enter transaction ID
3. Upload proof document
4. Submit payment
**Expected Result**:
- ✅ Transaction ID required
- ✅ Payment processed
- ✅ Proof document saved

#### Test Case 2.5: Online Payment
**Objective**: Test online payment flow
**Steps**:
1. Select "Online" payment mode
2. Enter amount
3. Submit without proof (should not require)
**Expected Result**:
- ✅ Proof not required for online
- ✅ Payment processed
- ✅ Transaction ID saved

---

### 🔒 Module 3: Security & Validation

#### Test Case 3.1: Overpayment Protection
**Objective**: Verify overpayment is blocked
**Steps**:
1. Open payment modal
2. Enter amount > balance amount
3. Try to submit
**Expected Result**:
- ❌ Payment blocked
- ✅ Error message displayed
- ✅ Form validation working

#### Test Case 3.2: Proof Upload Validation
**Objective**: Test proof upload requirements
**Steps**:
1. Select offline payment mode (Cash/Cheque/Card)
2. Try to submit without proof
**Expected Result**:
- ❌ Payment blocked
- ✅ "Proof upload mandatory" error shown

#### Test Case 3.3: File Upload Validation
**Objective**: Test file upload restrictions
**Steps**:
1. Try uploading invalid file types
2. Try uploading files > 5MB
**Expected Result**:
- ❌ Invalid files rejected
- ✅ Size limit enforced
- ✅ Error messages displayed

#### Test Case 3.4: Ward Access Control
**Objective**: Verify collector ward restrictions
**Steps**:
1. Login as collector
2. Check if only assigned wards shown
3. Try accessing demands from other wards
**Expected Result**:
- ✅ Only assigned ward demands visible
- ✅ Access control enforced

---

### 📄 Module 4: Receipt Generation

#### Test Case 4.1: Automatic Receipt
**Objective**: Verify receipt generation
**Steps**:
1. Complete any payment
2. Check if receipt is generated
3. Try downloading receipt
**Expected Result**:
- ✅ Receipt generated automatically
- ✅ PDF download works
- ✅ Receipt contains correct details

#### Test Case 4.2: Receipt Content
**Objective**: Verify receipt content accuracy
**Steps**:
1. Generate receipt
2. Check receipt details
**Expected Result**:
- ✅ Payment number correct
- ✅ Amount accurate
- ✅ Collector information shown
- ✅ Property details included

---

### 🔄 Module 5: Data Integration

#### Test Case 5.1: Demand Balance Update
**Objective**: Verify demand balance updates
**Steps**:
1. Note demand balance before payment
2. Make partial payment
3. Check updated balance
**Expected Result**:
- ✅ Balance reduced by payment amount
- ✅ Status updated if fully paid
- ✅ Payment history recorded

#### Test Case 5.2: Citizen Portal Reflection
**Objective**: Verify citizen portal updates
**Steps**:
1. Make payment as collector
2. Login as property owner
3. Check demands page
**Expected Result**:
- ✅ Payment reflected immediately
- ✅ Balance updated
- ✅ Status changed

---

### 📊 Module 6: Edge Cases

#### Test Case 6.1: No Unified Demands
**Objective**: Test behavior with no data
**Steps**:
1. Create collector with no assigned wards
2. Access Tax Summary
**Expected Result**:
- ✅ "No unified tax demands found" message
- ✅ No errors thrown

#### Test Case 6.2: Network Failure
**Objective**: Test API failure handling
**Steps**:
1. Disconnect network
2. Try accessing Tax Summary
3. Try making payment
**Expected Result**:
- ✅ Graceful error handling
- ✅ User-friendly error messages
- ✅ No app crashes

#### Test Case 6.3: Concurrent Payments
**Objective**: Test simultaneous payments
**Steps**:
1. Open payment modal in two tabs
2. Try paying same demand
**Expected Result**:
- ✅ First payment succeeds
- ✅ Second payment respects updated balance
- ✅ No data corruption

---

## Performance Testing

### Load Testing
- **Concurrent Users**: Test with 10+ collectors
- **Data Volume**: Test with 1000+ unified demands
- **File Upload**: Test proof upload performance

### Stress Testing
- **Large Payments**: Test high-value payments
- **Batch Operations**: Test multiple rapid payments
- **Memory Usage**: Monitor frontend memory consumption

---

## Browser Compatibility

### Supported Browsers
- ✅ Chrome (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Edge (Latest)

### Mobile Responsiveness
- ✅ Mobile view (320px+)
- ✅ Tablet view (768px+)
- ✅ Desktop view (1024px+)

---

## Regression Testing

### Existing Functionality
- ✅ Collector Dashboard still works
- ✅ Other collector pages unaffected
- ✅ Citizen portal unchanged
- ✅ Admin portal unaffected

### API Endpoints
- ✅ Existing payment endpoints work
- ✅ Demand endpoints enhanced
- ✅ New field collection endpoints working

---

## Known Issues & Limitations

### Current Limitations
1. **Real-time Updates**: No WebSocket for instant updates
2. **Bulk Operations**: No batch payment processing
3. **Offline Mode**: No offline payment capability

### Future Enhancements
1. **Mobile App**: Native mobile app support
2. **SMS Notifications**: Payment confirmation SMS
3. **Analytics**: Advanced collection analytics

---

## Test Data Setup

### Sample Unified Demands
```sql
-- Demand 1: UD-2026-27-1769750702171-8
-- Amount: ₹3,55,43,114.10
-- Status: pending
-- Property: Multiple properties

-- Demand 2: UD-2026-27-1769334355512-4  
-- Amount: ₹6,60,789.70
-- Status: pending
-- Property: Single property
```

### Test Users
```javascript
// Collector
{
  id: 3,
  email: "ro@gmail.com",
  role: "collector",
  firstName: "roshan",
  lastName: "singh"
}
```

---

## Bug Reporting Template

### Bug Report Format
```
**Bug ID**: [Auto-generated]
**Severity**: [Critical/High/Medium/Low]
**Module**: [Tax Summary/Payment Collection/etc]
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
**Actual Result**:
**Environment**: [Browser/OS/Device]
**Screenshots**: [Attach if applicable]
**Additional Notes**:
```

---

## Sign-off Checklist

### Pre-Production
- [ ] All test cases passed
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Backup procedures verified

### Production Deployment
- [ ] Database migration successful
- [ ] Frontend build completed
- [ ] API endpoints tested
- [ ] Monitoring configured
- [ ] Rollback plan ready

---

## Contact Information

**Development Team**: HTCMS Development Team
**QA Lead**: [QA Lead Name]
**Release Date**: [Release Date]
**Version**: 1.0.0

---

*This QA document should be updated with any new findings or issues discovered during testing.*
