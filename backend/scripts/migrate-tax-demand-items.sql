-- Migration: Create tax_demand_items table
-- This table stores individual tax items within a unified demand

CREATE TABLE IF NOT EXISTS tax_demand_items (
  id SERIAL PRIMARY KEY,
  "demandId" INTEGER NOT NULL,
  "taxType" VARCHAR(20) NOT NULL CHECK ("taxType" IN ('PROPERTY', 'WATER')),
  "referenceId" INTEGER NOT NULL,
  "connectionId" INTEGER,
  "baseAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "arrearsAmount" DECIMAL(12, 2) DEFAULT 0,
  "penaltyAmount" DECIMAL(12, 2) DEFAULT 0,
  "interestAmount" DECIMAL(12, 2) DEFAULT 0,
  "totalAmount" DECIMAL(12, 2) NOT NULL,
  description TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT fk_demand_item_demand
    FOREIGN KEY ("demandId")
    REFERENCES demands(id)
    ON DELETE CASCADE,
  
  CONSTRAINT fk_demand_item_connection
    FOREIGN KEY ("connectionId")
    REFERENCES water_connections(id)
    ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_demand_items_demand ON tax_demand_items("demandId");
CREATE INDEX IF NOT EXISTS idx_demand_items_tax_type ON tax_demand_items("taxType");
CREATE INDEX IF NOT EXISTS idx_demand_items_reference ON tax_demand_items("referenceId");
CREATE INDEX IF NOT EXISTS idx_demand_items_connection ON tax_demand_items("connectionId");

-- Comments
COMMENT ON TABLE tax_demand_items IS 'Stores individual tax items within a unified demand';
COMMENT ON COLUMN tax_demand_items."taxType" IS 'Type of tax: PROPERTY or WATER';
COMMENT ON COLUMN tax_demand_items."referenceId" IS 'Reference to assessment ID (property assessment or water tax assessment)';
COMMENT ON COLUMN tax_demand_items."connectionId" IS 'Water connection ID (only for WATER tax type)';
