-- Migration: Create water_tax_assessments table
-- This table stores water tax assessments linked to properties and water connections

-- Create water_tax_assessments table
CREATE TABLE IF NOT EXISTS water_tax_assessments (
  id SERIAL PRIMARY KEY,
  "assessmentNumber" VARCHAR(50) NOT NULL UNIQUE,
  "propertyId" INTEGER NOT NULL,
  "waterConnectionId" INTEGER NOT NULL,
  "assessmentYear" INTEGER NOT NULL,
  "assessmentType" VARCHAR(20) NOT NULL CHECK ("assessmentType" IN ('METERED', 'FIXED')),
  rate DECIMAL(10, 2) NOT NULL,
  remarks TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  "assessorId" INTEGER,
  "approvedBy" INTEGER,
  "approvalDate" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_water_tax_assessment_property 
    FOREIGN KEY ("propertyId") 
    REFERENCES properties(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_water_tax_assessment_connection 
    FOREIGN KEY ("waterConnectionId") 
    REFERENCES water_connections(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_water_tax_assessment_assessor 
    FOREIGN KEY ("assessorId") 
    REFERENCES users(id) 
    ON DELETE SET NULL,
  
  CONSTRAINT fk_water_tax_assessment_approver 
    FOREIGN KEY ("approvedBy") 
    REFERENCES users(id) 
    ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_water_tax_assessments_property ON water_tax_assessments("propertyId");
CREATE INDEX IF NOT EXISTS idx_water_tax_assessments_connection ON water_tax_assessments("waterConnectionId");
CREATE INDEX IF NOT EXISTS idx_water_tax_assessments_year ON water_tax_assessments("assessmentYear");
CREATE INDEX IF NOT EXISTS idx_water_tax_assessments_status ON water_tax_assessments(status);
CREATE INDEX IF NOT EXISTS idx_water_tax_assessments_type ON water_tax_assessments("assessmentType");
CREATE INDEX IF NOT EXISTS idx_water_tax_assessments_number ON water_tax_assessments("assessmentNumber");

-- Add comments
COMMENT ON TABLE water_tax_assessments IS 'Water tax assessments linked to properties and water connections';
COMMENT ON COLUMN water_tax_assessments."assessmentNumber" IS 'Unique assessment number';
COMMENT ON COLUMN water_tax_assessments."propertyId" IS 'Foreign key to properties table';
COMMENT ON COLUMN water_tax_assessments."waterConnectionId" IS 'Foreign key to water_connections table';
COMMENT ON COLUMN water_tax_assessments."assessmentYear" IS 'Year for which assessment is made';
COMMENT ON COLUMN water_tax_assessments."assessmentType" IS 'Type of assessment: METERED or FIXED';
COMMENT ON COLUMN water_tax_assessments.rate IS 'Rate per unit (for metered) or fixed rate (for fixed)';
COMMENT ON COLUMN water_tax_assessments.status IS 'Assessment status: draft, pending, approved, rejected';
