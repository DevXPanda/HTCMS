-- Migration: Add WATER_TAX support to demands table
-- This migration extends the demands table to support Water Tax demands

-- Step 1: Ensure all existing rows have valid serviceType values
-- Update any NULL or invalid values to 'HOUSE_TAX' (default)
UPDATE demands 
SET "serviceType" = 'HOUSE_TAX' 
WHERE "serviceType" IS NULL 
   OR "serviceType" NOT IN ('HOUSE_TAX', 'D2DC');

-- Step 2: Add waterTaxAssessmentId column (nullable, only for WATER_TAX)
ALTER TABLE demands 
ADD COLUMN IF NOT EXISTS "waterTaxAssessmentId" INTEGER;

-- Step 3: Update serviceType CHECK constraint to include WATER_TAX
-- First, drop the existing constraint
ALTER TABLE demands 
DROP CONSTRAINT IF EXISTS check_service_type;

-- Step 4: Add new constraint with WATER_TAX
ALTER TABLE demands 
ADD CONSTRAINT check_service_type 
CHECK ("serviceType" IN ('HOUSE_TAX', 'D2DC', 'WATER_TAX'));

-- Step 5: Add foreign key constraint for waterTaxAssessmentId
-- Note: This will only work if water_tax_assessments table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'water_tax_assessments') THEN
    -- Drop constraint if it already exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_demand_water_tax_assessment' 
      AND table_name = 'demands'
    ) THEN
      ALTER TABLE demands DROP CONSTRAINT fk_demand_water_tax_assessment;
    END IF;
    
    -- Add the constraint
    ALTER TABLE demands 
    ADD CONSTRAINT fk_demand_water_tax_assessment 
      FOREIGN KEY ("waterTaxAssessmentId") 
      REFERENCES water_tax_assessments(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Step 6: Create index for waterTaxAssessmentId
CREATE INDEX IF NOT EXISTS idx_demands_water_tax_assessment ON demands("waterTaxAssessmentId");

-- Step 7: Add composite index for property + serviceType + financialYear (for combined queries)
CREATE INDEX IF NOT EXISTS idx_demands_property_service_year ON demands("propertyId", "serviceType", "financialYear");

-- Comments
COMMENT ON COLUMN demands."waterTaxAssessmentId" IS 'Foreign key to water_tax_assessments table (only for WATER_TAX serviceType)';
COMMENT ON COLUMN demands."serviceType" IS 'Service type: HOUSE_TAX, D2DC, or WATER_TAX';
