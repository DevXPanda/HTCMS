-- IMMEDIATE FIX: Drop NOT NULL constraint on assessmentId
-- Run this SQL directly in your database to fix the constraint error

-- Simple, direct command - no conditional logic needed
ALTER TABLE demands 
ALTER COLUMN "assessmentId" DROP NOT NULL;

-- Verify it worked (run this query after the ALTER command):
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'demands' AND column_name = 'assessmentId';
-- Expected result: is_nullable = 'YES'
