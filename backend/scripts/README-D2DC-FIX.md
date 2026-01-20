# D2DC Database Constraint Fix

## Problem
When generating D2DC demands, the system throws:
```
null value in column 'assessmentId' of relation 'demands' violates not-null constraint
```

## Root Cause
The `assessmentId` column in the `demands` table has a NOT NULL constraint at the database level, but D2DC demands don't require assessments (they're linked directly to properties).

## Solution

### 1. Database Migration
Run the migration script to drop the NOT NULL constraint:

```bash
psql -U your_user -d your_database -f backend/scripts/migrate-d2dc-service-type.sql
```

Or run the standalone fix:
```bash
psql -U your_user -d your_database -f backend/scripts/fix-assessment-id-nullable.sql
```

### 2. Model Validation (Already Implemented)
The `Demand` model now includes:
- `assessmentId: { allowNull: true }` - Allows NULL values
- `beforeValidate` hook - Ensures:
  - D2DC demands have `assessmentId = null`
  - HOUSE_TAX demands have `assessmentId` required

### 3. Controller Validation (Already Implemented)
Both `createDemand` and `createD2DCDemand` controllers:
- Explicitly set `assessmentId: null` for D2DC
- Validate that D2DC doesn't receive assessmentId
- Validate that HOUSE_TAX requires assessmentId

## Verification

### Check Database Constraint
```sql
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'demands' AND column_name = 'assessmentId';
-- Expected: is_nullable = 'YES'
```

### Check Data Integrity
```sql
SELECT 
    "serviceType", 
    COUNT(*) as total,
    COUNT("assessmentId") as with_assessment,
    SUM(CASE WHEN "assessmentId" IS NULL THEN 1 ELSE 0 END) as null_assessment
FROM demands 
GROUP BY "serviceType";
-- Expected: 
-- HOUSE_TAX: null_assessment = 0
-- D2DC: null_assessment = total (all D2DC should have NULL)
```

## Test Cases

1. ✅ Generate D2DC demand without assessmentId
2. ✅ Generate HOUSE_TAX demand with assessmentId
3. ✅ Reject D2DC demand with assessmentId provided
4. ✅ Reject HOUSE_TAX demand without assessmentId
5. ✅ Verify existing HOUSE_TAX demands remain unchanged

## Files Modified

1. `backend/scripts/migrate-d2dc-service-type.sql` - Updated to drop NOT NULL constraint
2. `backend/scripts/fix-assessment-id-nullable.sql` - Standalone fix script
3. `backend/models/Demand.js` - Added beforeValidate hook
4. `backend/controllers/demand.controller.js` - Enhanced validation

## Important Notes

- **D2DC is NOT a tax assessment** - It's a municipal service
- **D2DC is linked to Property**, not Assessment
- **HOUSE_TAX requires Assessment** - This is unchanged
- **Backward compatibility maintained** - All existing HOUSE_TAX demands work as before
