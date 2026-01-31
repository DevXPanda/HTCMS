-- =====================================================
-- HTCMS - Water Connection Requests Table Migration
-- =====================================================
-- This script creates the water_connection_requests table
-- Run this in Supabase SQL Editor or via psql
-- =====================================================

-- Create water_connection_requests table
CREATE TABLE IF NOT EXISTS water_connection_requests (
    id SERIAL PRIMARY KEY,
    "requestNumber" VARCHAR(50) NOT NULL UNIQUE,
    "propertyId" INTEGER NOT NULL,
    "requestedBy" INTEGER NOT NULL,
    "propertyLocation" TEXT NOT NULL,
    "connectionType" VARCHAR(20) NOT NULL CHECK ("connectionType" IN ('domestic', 'commercial', 'industrial')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
    remarks TEXT NULL,
    "adminRemarks" TEXT NULL,
    "processedBy" INTEGER NULL,
    "processedAt" TIMESTAMP WITH TIME ZONE NULL,
    "waterConnectionId" INTEGER NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_water_connection_requests_property 
        FOREIGN KEY ("propertyId") 
        REFERENCES properties(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_water_connection_requests_requested_by 
        FOREIGN KEY ("requestedBy") 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_water_connection_requests_processed_by 
        FOREIGN KEY ("processedBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_water_connection_requests_water_connection 
        FOREIGN KEY ("waterConnectionId") 
        REFERENCES water_connections(id) 
        ON DELETE SET NULL
);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_water_connection_requests_status ON water_connection_requests(status);
CREATE INDEX IF NOT EXISTS idx_water_connection_requests_property_id ON water_connection_requests("propertyId");
CREATE INDEX IF NOT EXISTS idx_water_connection_requests_requested_by ON water_connection_requests("requestedBy");

-- Add comment to table
COMMENT ON TABLE water_connection_requests IS 'Stores water connection requests from citizens';
