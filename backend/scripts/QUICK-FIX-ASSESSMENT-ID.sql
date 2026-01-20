-- ============================================================
-- QUICK FIX: Drop NOT NULL constraint on assessmentId
-- ============================================================
-- Run this SQL command directly in your database SQL editor
-- This fixes the "null value in column 'assessmentId' violates not-null constraint" error
--
-- IMPORTANT: D2DC (Door-to-Door Garbage Collection) is a municipal service,
-- NOT a tax assessment. It is linked directly to property, not assessment.
-- ============================================================

ALTER TABLE demands 
ALTER COLUMN "assessmentId" DROP NOT NULL;

-- ============================================================
-- VERIFICATION: Run this query to confirm the fix worked
-- ============================================================
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'demands' AND column_name = 'assessmentId';
-- 
-- Expected result: is_nullable = 'YES'
-- ============================================================
