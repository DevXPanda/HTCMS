-- =====================================================
-- HTCMS - Water Tax Module Schema Migration
-- =====================================================
-- This script adds the Water Tax module tables to Supabase
-- Run this in Supabase SQL Editor or via psql
-- =====================================================

-- Step 1: Create water_connections table
CREATE TABLE IF NOT EXISTS water_connections (
    id SERIAL PRIMARY KEY,
    "connectionNumber" VARCHAR(50) NOT NULL UNIQUE,
    "propertyId" INTEGER NOT NULL,
    "meterNumber" VARCHAR(50) NULL,
    "connectionDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectionDate" TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'DISCONNECTED')),
    "connectionType" VARCHAR(20) NOT NULL DEFAULT 'domestic' CHECK ("connectionType" IN ('domestic', 'commercial', 'industrial')),
    "isMetered" BOOLEAN NOT NULL DEFAULT false,
    "pipeSize" VARCHAR(20) NULL,
    "monthlyRate" DECIMAL(10, 2) NULL,
    remarks TEXT NULL,
    "createdBy" INTEGER NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_water_connections_property 
        FOREIGN KEY ("propertyId") 
        REFERENCES properties(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_water_connections_created_by 
        FOREIGN KEY ("createdBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Step 2: Create water_meter_readings table
CREATE TABLE IF NOT EXISTS water_meter_readings (
    id SERIAL PRIMARY KEY,
    "readingNumber" VARCHAR(50) NOT NULL UNIQUE,
    "waterConnectionId" INTEGER NOT NULL,
    "readingDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentReading" DECIMAL(10, 2) NOT NULL,
    "previousReading" DECIMAL(10, 2) NULL,
    consumption DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "readingType" VARCHAR(20) NOT NULL DEFAULT 'actual' CHECK ("readingType" IN ('actual', 'estimated', 'corrected')),
    "readerName" VARCHAR(100) NULL,
    "readerId" INTEGER NULL,
    remarks TEXT NULL,
    "photoUrl" VARCHAR(500) NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_water_meter_readings_connection 
        FOREIGN KEY ("waterConnectionId") 
        REFERENCES water_connections(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_water_meter_readings_reader 
        FOREIGN KEY ("readerId") 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Step 3: Create water_bills table
CREATE TABLE IF NOT EXISTS water_bills (
    id SERIAL PRIMARY KEY,
    "billNumber" VARCHAR(50) NOT NULL UNIQUE,
    "waterConnectionId" INTEGER NOT NULL,
    "meterReadingId" INTEGER NULL,
    "billingPeriod" VARCHAR(20) NOT NULL,
    consumption DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "fixedCharge" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "consumptionCharge" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "arrearsAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "penaltyAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12, 2) NOT NULL,
    "paidAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12, 2) NOT NULL,
    "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "billDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    "generatedBy" INTEGER NULL,
    remarks TEXT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_water_bills_connection 
        FOREIGN KEY ("waterConnectionId") 
        REFERENCES water_connections(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_water_bills_meter_reading 
        FOREIGN KEY ("meterReadingId") 
        REFERENCES water_meter_readings(id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_water_bills_generated_by 
        FOREIGN KEY ("generatedBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Step 4: Create water_payments table
CREATE TABLE IF NOT EXISTS water_payments (
    id SERIAL PRIMARY KEY,
    "paymentNumber" VARCHAR(50) NOT NULL UNIQUE,
    "waterBillId" INTEGER NOT NULL,
    "waterConnectionId" INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    "paymentMode" VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK ("paymentMode" IN ('cash', 'cheque', 'dd', 'online', 'card', 'upi')),
    "paymentDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chequeNumber" VARCHAR(50) NULL,
    "chequeDate" TIMESTAMP WITH TIME ZONE NULL,
    "bankName" VARCHAR(100) NULL,
    "transactionId" VARCHAR(100) NULL,
    "razorpayOrderId" VARCHAR(100) NULL,
    "razorpayPaymentId" VARCHAR(100) NULL,
    "razorpaySignature" VARCHAR(255) NULL,
    "receiptNumber" VARCHAR(50) NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    "receivedBy" INTEGER NULL,
    remarks TEXT NULL,
    "receiptPdfUrl" VARCHAR(500) NULL,
    "receiptGeneratedAt" TIMESTAMP WITH TIME ZONE NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_water_payments_bill 
        FOREIGN KEY ("waterBillId") 
        REFERENCES water_bills(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_water_payments_connection 
        FOREIGN KEY ("waterConnectionId") 
        REFERENCES water_connections(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_water_payments_received_by 
        FOREIGN KEY ("receivedBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Step 5: Add comments to tables
COMMENT ON TABLE water_connections IS 'Water connections linked to properties';
COMMENT ON TABLE water_meter_readings IS 'Water meter readings for connections';
COMMENT ON TABLE water_bills IS 'Water bills generated for connections';
COMMENT ON TABLE water_payments IS 'Payments made against water bills';

-- Step 6: Add comments to key columns
COMMENT ON COLUMN water_connections."propertyId" IS 'Foreign key to properties table';
COMMENT ON COLUMN water_connections.status IS 'Connection status: DRAFT, ACTIVE, or DISCONNECTED';
COMMENT ON COLUMN water_connections."isMetered" IS 'Whether the connection has a meter';
COMMENT ON COLUMN water_meter_readings."waterConnectionId" IS 'Foreign key to water_connections table';
COMMENT ON COLUMN water_bills."waterConnectionId" IS 'Foreign key to water_connections table';
COMMENT ON COLUMN water_payments."waterBillId" IS 'Foreign key to water_bills table';
COMMENT ON COLUMN water_payments."waterConnectionId" IS 'Foreign key to water_connections table';

-- Step 7: Create indexes for performance
-- Indexes for water_connections
CREATE INDEX IF NOT EXISTS idx_water_connections_property_id 
    ON water_connections("propertyId");

CREATE INDEX IF NOT EXISTS idx_water_connections_status 
    ON water_connections(status);

CREATE INDEX IF NOT EXISTS idx_water_connections_connection_number 
    ON water_connections("connectionNumber");

-- Indexes for water_meter_readings
CREATE INDEX IF NOT EXISTS idx_water_meter_readings_connection_id 
    ON water_meter_readings("waterConnectionId");

CREATE INDEX IF NOT EXISTS idx_water_meter_readings_reading_date 
    ON water_meter_readings("readingDate");

CREATE INDEX IF NOT EXISTS idx_water_meter_readings_reader_id 
    ON water_meter_readings("readerId");

-- Indexes for water_bills
CREATE INDEX IF NOT EXISTS idx_water_bills_connection_id 
    ON water_bills("waterConnectionId");

CREATE INDEX IF NOT EXISTS idx_water_bills_status 
    ON water_bills(status);

CREATE INDEX IF NOT EXISTS idx_water_bills_due_date 
    ON water_bills("dueDate");

CREATE INDEX IF NOT EXISTS idx_water_bills_billing_period 
    ON water_bills("billingPeriod");

-- Indexes for water_payments
CREATE INDEX IF NOT EXISTS idx_water_payments_bill_id 
    ON water_payments("waterBillId");

CREATE INDEX IF NOT EXISTS idx_water_payments_connection_id 
    ON water_payments("waterConnectionId");

CREATE INDEX IF NOT EXISTS idx_water_payments_status 
    ON water_payments(status);

CREATE INDEX IF NOT EXISTS idx_water_payments_payment_date 
    ON water_payments("paymentDate");

-- =====================================================
-- Migration Complete!
-- =====================================================
-- The water tax module tables have been created with:
-- - water_connections (with property_id FK and status field)
-- - water_meter_readings
-- - water_bills
-- - water_payments
-- - All required foreign keys and indexes
-- =====================================================
