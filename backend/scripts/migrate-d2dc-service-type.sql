-- Migration: Add serviceType ENUM to demands table for D2DC support
-- This migration adds support for D2DC (Door-to-Door Garbage Collection) as a separate service type
-- Existing demands will default to HOUSE_TAX for backward compatibility

-- Step 1: Add serviceType column with default value
ALTER TABLE demands 
ADD COLUMN IF NOT EXISTS "serviceType" VARCHAR(20) DEFAULT 'HOUSE_TAX';

-- Step 2: Update existing records to HOUSE_TAX (if any NULL values exist)
UPDATE demands 
SET "serviceType" = 'HOUSE_TAX' 
WHERE "serviceType" IS NULL;

-- Step 3: Add CHECK constraint to ensure only valid values
ALTER TABLE demands 
ADD CONSTRAINT check_service_type 
CHECK ("serviceType" IN ('HOUSE_TAX', 'D2DC'));

-- Step 4: Make serviceType NOT NULL (after setting defaults)
ALTER TABLE demands 
ALTER COLUMN "serviceType" SET NOT NULL;

-- Step 5: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_demands_service_type ON demands("serviceType");

-- Step 6: Add composite index for property + serviceType queries
CREATE INDEX IF NOT EXISTS idx_demands_property_service ON demands("propertyId", "serviceType");

-- Step 7: Make assessmentId nullable for D2DC demands (D2DC doesn't require assessment)
-- CRITICAL: D2DC is a municipal service, NOT a tax assessment
-- D2DC demands are linked directly to property, not assessment
-- This fixes the database constraint error when generating D2DC demands

-- Drop the NOT NULL constraint on assessmentId
-- This allows D2DC demands to have assessmentId = NULL
ALTER TABLE demands 
ALTER COLUMN "assessmentId" DROP NOT NULL;

-- Step 8: Add constraint to ensure assessmentId is provided for HOUSE_TAX demands
-- This constraint ensures data integrity:
-- - HOUSE_TAX demands MUST have assessmentId
-- - D2DC demands MUST have assessmentId = NULL
-- Note: This is enforced at application level via model hooks for better error messages
-- Database-level constraint would be: CHECK (("serviceType" = 'HOUSE_TAX' AND "assessmentId" IS NOT NULL) OR ("serviceType" = 'D2DC' AND "assessmentId" IS NULL))
-- However, we use application-level validation for clearer error messages

-- Verification queries (run manually to verify):
-- SELECT "serviceType", COUNT(*) FROM demands GROUP BY "serviceType";
-- SELECT "serviceType", COUNT(*) FROM demands WHERE "assessmentId" IS NULL GROUP BY "serviceType";
-- SELECT "serviceType", COUNT(*) FROM demands WHERE "assessmentId" IS NOT NULL GROUP BY "serviceType";
