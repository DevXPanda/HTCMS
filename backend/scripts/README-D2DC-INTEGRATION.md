# D2DC Integration - Implementation Summary

## Overview
This document describes the integration of D2DC (Door-to-Door Garbage Collection) into the existing HTCMS (House Tax) system.

## Database Changes

### Migration Script
Run the migration script to add `serviceType` field to `demands` table:
```bash
psql -U your_user -d your_database -f backend/scripts/migrate-d2dc-service-type.sql
```

### Schema Changes
- Added `serviceType` ENUM field to `demands` table: `HOUSE_TAX`, `D2DC`
- Made `assessmentId` nullable in `Demand` model (D2DC doesn't require assessment)
- Added `visitPurpose` field to `field_visits` table: `house_tax`, `garbage_collection`, `both`
- Extended `visitType` ENUM to include `garbage_collection`

## Backend Changes

### Models Updated
1. **Demand.js**: Added `serviceType` field with default `HOUSE_TAX`
2. **FieldVisit.js**: Added `visitPurpose` field and extended `visitType` enum

### Controllers Updated

#### 1. Demand Controller (`demand.controller.js`)
- Modified `createDemand` to support both HOUSE_TAX and D2DC
- Added `createD2DCDemand` endpoint for D2DC-specific demand generation
- Updated `getAllDemands` to filter by `serviceType`
- Updated statistics to separate HOUSE_TAX and D2DC

#### 2. Payment Controller (`payment.controller.js`)
- Already handles payments for any demand type (no changes needed)
- Payments are linked to demands, which now have `serviceType`

#### 3. Field Visit Controller (`fieldVisit.controller.js`)
- Added support for `visitPurpose` field
- Extended payment collection to support multiple payments (House Tax + D2DC)
- Added `garbage_collection` visit type
- Updated audit logs to include `serviceType`

#### 4. Citizen Controller (`citizen.controller.js`)
- Updated dashboard to show HOUSE_TAX and D2DC separately
- Added `houseTaxOutstanding`, `d2dcOutstanding` fields
- Separated pending demands by serviceType

#### 5. Report Controller (`report.controller.js`)
- Updated dashboard stats to separate HOUSE_TAX and D2DC revenue
- Updated revenue report to show collections by serviceType
- Updated outstanding report to separate by serviceType

#### 6. Task Generator Service (`taskGeneratorService.js`)
- Already handles all demands (no changes needed)
- D2DC demands automatically included in collector tasks

### Routes Added
- `POST /api/demands/d2dc` - Generate D2DC demand for a property

## API Endpoints

### Generate D2DC Demand
```
POST /api/demands/d2dc
Body: {
  propertyId: number (required),
  month: string (required, format: "YYYY-MM"),
  baseAmount: number (optional, default: 50),
  dueDate: string (optional),
  remarks: string (optional)
}
```

### Generate Combined Demand (House Tax + D2DC)
```
POST /api/demands
Body: {
  // For HOUSE_TAX:
  assessmentId: number (required for HOUSE_TAX),
  serviceType: "HOUSE_TAX",
  financialYear: string,
  dueDate: string,
  
  // For D2DC:
  propertyId: number (required for D2DC),
  serviceType: "D2DC",
  baseAmount: number (required for D2DC),
  financialYear: string (used as month identifier),
  dueDate: string
}
```

### Field Visit with Multiple Payments
```
POST /api/field-visits
Body: {
  demandId: number (primary demand),
  propertyId: number,
  visitType: "payment_collection",
  visitPurpose: "both", // or "house_tax" or "garbage_collection"
  citizenResponse: "will_pay_today",
  payments: [
    {
      demandId: number,
      amount: number,
      paymentMode: "cash" | "upi" | "card" | "cheque",
      transactionId: string (for upi/card),
      chequeNumber: string (for cheque),
      chequeDate: string (for cheque),
      bankName: string (for cheque)
    }
  ],
  remarks: string
}
```

## Frontend Changes Required

### Admin Panel
1. **Demand Generation UI** (`GenerateDemands.jsx`)
   - Add checkboxes: "Generate House Tax" and "Generate D2DC"
   - Show two sections when property selected:
     - House Tax Demand section
     - D2DC (Garbage Collection) section
   - Allow generating both together

### Collector Panel
1. **Daily Tasks** (`DailyTasks.jsx`)
   - Show unified view with both House Tax and D2DC tasks
   - Display serviceType badge/indicator
   - Show pending amounts separately

2. **Field Visit Recording**
   - Add visit type options: "House Tax Follow-up", "Garbage Collection", "Payment Collection"
   - For Payment Collection:
     - Allow selecting what is being paid (House Tax, D2DC, Both)
     - Support multiple payment entries
     - Payment modes: Cash, UPI, Card, Cheque

### Citizen Panel
1. **Dashboard** (`CitizenDashboard.jsx`)
   - Show House Tax and D2DC separately
   - Display pending amounts for each
   - Show payment history with serviceType tags

2. **Demands Page** (`CitizenDemands.jsx`)
   - Group by serviceType
   - Show clear labels: "House Tax" vs "Garbage Collection (D2DC)"

3. **Payments Page** (`CitizenPayments.jsx`)
   - Tag payments with serviceType
   - Filter by serviceType option

## Key Features

1. **Separate Service Types**: HOUSE_TAX and D2DC are completely separate
2. **Unified Property View**: Both services linked to same property
3. **Independent Payment Tracking**: Each service has separate payment records
4. **Unified Collector Tasks**: Collectors see both types in single dashboard
5. **Flexible Payment Collection**: Can collect both services in single visit
6. **Separate Reports**: All reports show HOUSE_TAX and D2DC separately

## Backward Compatibility

- All existing HOUSE_TAX demands continue to work
- Existing data remains untouched
- Default `serviceType` is `HOUSE_TAX` for backward compatibility
- All existing APIs continue to work

## Testing Checklist

- [ ] Admin can generate D2DC demand
- [ ] Admin can generate House Tax demand
- [ ] Admin can generate both together
- [ ] Collector sees D2DC tasks in dashboard
- [ ] Collector can record garbage collection visit
- [ ] Collector can collect D2DC payment
- [ ] Collector can collect both payments together
- [ ] Citizen sees D2DC separately
- [ ] Reports show D2DC separately
- [ ] No breaking changes to existing flows

## Migration Steps

1. Run database migration: `migrate-d2dc-service-type.sql`
2. Restart backend server
3. Update frontend components
4. Test all flows
5. Deploy to production

## Notes

- D2DC demands use `financialYear` field to store month/year (format: "YYYY-MM")
- D2DC doesn't require assessment (assessmentId is null)
- Default D2DC amount is ₹50/month (configurable)
- Field visits can be for House Tax, Garbage Collection, or Both
- Payment collection supports multiple demands in single visit
