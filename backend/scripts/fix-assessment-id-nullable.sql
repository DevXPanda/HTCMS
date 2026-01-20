-- CRITICAL FIX: Make assessmentId nullable for D2DC demands
-- This migration fixes the database constraint issue where D2DC demand generation fails
-- because assessmentId has a NOT NULL constraint, but D2DC doesn't require assessments.

-- IMPORTANT: D2DC (Door-to-Door Garbage Collection) is a municipal service,
-- NOT a tax assessment. It is linked directly to property, not assessment.

-- Step 1: Drop the NOT NULL constraint on assessmentId
-- This allows D2DC demands to have assessmentId = NULL
ALTER TABLE demands 
ALTER COLUMN "assessmentId" DROP NOT NULL;

-- Step 2: Verify the change
-- Run this query to verify: SELECT column_name, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'demands' AND column_name = 'assessmentId';
-- Expected result: is_nullable = 'YES'

-- Step 3: Verify existing data integrity
-- Check that all HOUSE_TAX demands have assessmentId
-- SELECT "serviceType", COUNT(*) as total, 
--        COUNT("assessmentId") as with_assessment,
--        COUNT(*) FILTER (WHERE "assessmentId" IS NULL) as without_assessment
-- FROM demands 
-- GROUP BY "serviceType";
-- Expected: HOUSE_TAX should have 0 without_assessment, D2DC can have NULL

-- Step 4: Optional - Add a check constraint for data integrity (application-level validation preferred)
-- This ensures HOUSE_TAX always has assessmentId and D2DC always has NULL
-- Note: We use application-level validation (model hooks) for better error messages
-- Uncomment if you want database-level enforcement:
-- ALTER TABLE demands 
-- ADD CONSTRAINT check_assessment_by_service_type 
-- CHECK (
--   ("serviceType" = 'HOUSE_TAX' AND "assessmentId" IS NOT NULL) OR 
--   ("serviceType" = 'D2DC' AND "assessmentId" IS NULL)
-- );

-- Verification queries (run after migration):
-- 1. Check constraint is dropped:
--    SELECT column_name, is_nullable, data_type 
--    FROM information_schema.columns 
--    WHERE table_name = 'demands' AND column_name = 'assessmentId';
--
-- 2. Check data distribution:
--    SELECT "serviceType", 
--           COUNT(*) as total,
--           COUNT("assessmentId") as with_assessment,
--           SUM(CASE WHEN "assessmentId" IS NULL THEN 1 ELSE 0 END) as null_assessment
--    FROM demands 
--    GROUP BY "serviceType";
