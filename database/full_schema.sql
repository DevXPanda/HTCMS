-- =====================================================
-- HTCMS - Complete Database Schema
-- PostgreSQL Database Schema
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS demands CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS wards CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing ENUM types if they exist
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS property_type_enum CASCADE;
DROP TYPE IF EXISTS property_usage_type_enum CASCADE;
DROP TYPE IF EXISTS construction_type_enum CASCADE;
DROP TYPE IF EXISTS occupancy_status_enum CASCADE;
DROP TYPE IF EXISTS property_status_enum CASCADE;
DROP TYPE IF EXISTS assessment_status_enum CASCADE;
DROP TYPE IF EXISTS demand_status_enum CASCADE;
DROP TYPE IF EXISTS payment_mode_enum CASCADE;
DROP TYPE IF EXISTS payment_status_enum CASCADE;

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================

CREATE TYPE user_role_enum AS ENUM ('admin', 'assessor', 'cashier', 'collector', 'citizen');
CREATE TYPE property_type_enum AS ENUM ('residential', 'commercial', 'industrial', 'agricultural', 'mixed');
CREATE TYPE property_usage_type_enum AS ENUM ('residential', 'commercial', 'industrial', 'agricultural', 'mixed', 'institutional');
CREATE TYPE construction_type_enum AS ENUM ('RCC', 'Pucca', 'Kutcha', 'Semi-Pucca');
CREATE TYPE occupancy_status_enum AS ENUM ('owner_occupied', 'tenant_occupied', 'vacant');
CREATE TYPE property_status_enum AS ENUM ('active', 'inactive', 'pending', 'disputed');
CREATE TYPE assessment_status_enum AS ENUM ('draft', 'pending', 'approved', 'rejected');
CREATE TYPE demand_status_enum AS ENUM ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_mode_enum AS ENUM ('cash', 'cheque', 'dd', 'online', 'card');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "lastName" VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    role user_role_enum NOT NULL DEFAULT 'citizen',
    "isActive" BOOLEAN DEFAULT TRUE,
    "lastLogin" TIMESTAMP,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_created_by FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE users IS 'System users including admins, assessors, cashiers, collectors, and citizens';
COMMENT ON COLUMN users.role IS 'User role: admin, assessor, cashier, collector, or citizen';
COMMENT ON COLUMN users."createdBy" IS 'ID of user who created this user record';

-- Wards Table
CREATE TABLE wards (
    id SERIAL PRIMARY KEY,
    "wardNumber" VARCHAR(20) NOT NULL UNIQUE,
    "wardName" VARCHAR(100) NOT NULL,
    description TEXT,
    "collectorId" INTEGER,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ward_collector FOREIGN KEY ("collectorId") REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE wards IS 'Administrative wards for property management';
COMMENT ON COLUMN wards."collectorId" IS 'Assigned Tax Collector user ID';

-- Properties Table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    "propertyNumber" VARCHAR(50) NOT NULL UNIQUE,
    "ownerId" INTEGER NOT NULL,
    "ownerName" VARCHAR(100),
    "ownerPhone" VARCHAR(20),
    "wardId" INTEGER NOT NULL,
    "propertyType" property_type_enum NOT NULL,
    "usageType" property_usage_type_enum,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    area DECIMAL(10, 2) NOT NULL,
    "builtUpArea" DECIMAL(10, 2),
    floors INTEGER DEFAULT 1,
    "constructionType" construction_type_enum,
    "constructionYear" INTEGER,
    geolocation JSONB,
    photos JSONB,
    "occupancyStatus" occupancy_status_enum DEFAULT 'owner_occupied',
    status property_status_enum DEFAULT 'active',
    "isActive" BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_property_owner FOREIGN KEY ("ownerId") REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_property_ward FOREIGN KEY ("wardId") REFERENCES wards(id) ON DELETE RESTRICT,
    CONSTRAINT fk_property_created_by FOREIGN KEY ("createdBy") REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE properties IS 'Property records for tax assessment';
COMMENT ON COLUMN properties."ownerName" IS 'Direct owner name (if different from User)';
COMMENT ON COLUMN properties."usageType" IS 'Actual usage type of the property';
COMMENT ON COLUMN properties.area IS 'Area in square meters';
COMMENT ON COLUMN properties.geolocation IS 'Stores {latitude, longitude} coordinates';
COMMENT ON COLUMN properties.photos IS 'Array of photo URLs/paths';

-- Assessments Table
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    "assessmentNumber" VARCHAR(50) NOT NULL UNIQUE,
    "propertyId" INTEGER NOT NULL,
    "assessmentYear" INTEGER NOT NULL,
    "assessedValue" DECIMAL(12, 2) NOT NULL,
    "taxRate" DECIMAL(5, 2) NOT NULL,
    "annualTaxAmount" DECIMAL(12, 2) NOT NULL,
    "assessmentDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status assessment_status_enum DEFAULT 'draft',
    "assessorId" INTEGER,
    "approvedBy" INTEGER,
    "approvalDate" TIMESTAMP,
    remarks TEXT,
    "landValue" DECIMAL(12, 2),
    "buildingValue" DECIMAL(12, 2),
    depreciation DECIMAL(12, 2) DEFAULT 0,
    "exemptionAmount" DECIMAL(12, 2) DEFAULT 0,
    "effectiveDate" DATE,
    "expiryDate" DATE,
    "revisionNumber" INTEGER DEFAULT 0,
    "previousAssessmentId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assessment_property FOREIGN KEY ("propertyId") REFERENCES properties(id) ON DELETE RESTRICT,
    CONSTRAINT fk_assessment_assessor FOREIGN KEY ("assessorId") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_assessment_approved_by FOREIGN KEY ("approvedBy") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_assessment_previous FOREIGN KEY ("previousAssessmentId") REFERENCES assessments(id) ON DELETE SET NULL
);

COMMENT ON TABLE assessments IS 'Property tax assessments';
COMMENT ON COLUMN assessments."assessedValue" IS 'Total assessed value of the property';
COMMENT ON COLUMN assessments."taxRate" IS 'Tax rate percentage';
COMMENT ON COLUMN assessments."annualTaxAmount" IS 'Annual tax amount calculated';
COMMENT ON COLUMN assessments."landValue" IS 'Value of the land';
COMMENT ON COLUMN assessments."buildingValue" IS 'Value of the building/construction';
COMMENT ON COLUMN assessments.depreciation IS 'Depreciation amount';
COMMENT ON COLUMN assessments."exemptionAmount" IS 'Exemption amount if any';
COMMENT ON COLUMN assessments."effectiveDate" IS 'Date from which assessment is effective';
COMMENT ON COLUMN assessments."expiryDate" IS 'Date until which assessment is valid';
COMMENT ON COLUMN assessments."revisionNumber" IS 'Number of times assessment has been revised';
COMMENT ON COLUMN assessments."previousAssessmentId" IS 'Reference to previous assessment if revised';

-- Demands Table
CREATE TABLE demands (
    id SERIAL PRIMARY KEY,
    "demandNumber" VARCHAR(50) NOT NULL UNIQUE,
    "propertyId" INTEGER NOT NULL,
    "assessmentId" INTEGER NOT NULL,
    "financialYear" VARCHAR(10) NOT NULL,
    "baseAmount" DECIMAL(12, 2) NOT NULL,
    "arrearsAmount" DECIMAL(12, 2) DEFAULT 0,
    "penaltyAmount" DECIMAL(12, 2) DEFAULT 0,
    "interestAmount" DECIMAL(12, 2) DEFAULT 0,
    "totalAmount" DECIMAL(12, 2) NOT NULL,
    "paidAmount" DECIMAL(12, 2) DEFAULT 0,
    "balanceAmount" DECIMAL(12, 2) NOT NULL,
    "dueDate" DATE NOT NULL,
    status demand_status_enum DEFAULT 'pending',
    "generatedBy" INTEGER,
    "generatedDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_demand_property FOREIGN KEY ("propertyId") REFERENCES properties(id) ON DELETE RESTRICT,
    CONSTRAINT fk_demand_assessment FOREIGN KEY ("assessmentId") REFERENCES assessments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_demand_generated_by FOREIGN KEY ("generatedBy") REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE demands IS 'Tax demand notices generated from assessments';
COMMENT ON COLUMN demands."financialYear" IS 'Format: 2024-25';
COMMENT ON COLUMN demands."baseAmount" IS 'Base tax amount from assessment';
COMMENT ON COLUMN demands."arrearsAmount" IS 'Arrears from previous years';
COMMENT ON COLUMN demands."penaltyAmount" IS 'Penalty for late payment';
COMMENT ON COLUMN demands."interestAmount" IS 'Interest on overdue amount';
COMMENT ON COLUMN demands."totalAmount" IS 'Total amount due (base + arrears + penalty + interest)';
COMMENT ON COLUMN demands."paidAmount" IS 'Total amount paid so far';
COMMENT ON COLUMN demands."balanceAmount" IS 'Balance amount to be paid';

-- Payments Table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    "paymentNumber" VARCHAR(50) NOT NULL UNIQUE,
    "demandId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    "paymentMode" payment_mode_enum NOT NULL DEFAULT 'cash',
    "paymentDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chequeNumber" VARCHAR(50),
    "chequeDate" DATE,
    "bankName" VARCHAR(100),
    "transactionId" VARCHAR(100),
    "razorpayOrderId" VARCHAR(100),
    "razorpayPaymentId" VARCHAR(100),
    "razorpaySignature" VARCHAR(255),
    "receiptNumber" VARCHAR(50) UNIQUE,
    status payment_status_enum DEFAULT 'pending',
    "receivedBy" INTEGER,
    remarks TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_demand FOREIGN KEY ("demandId") REFERENCES demands(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_property FOREIGN KEY ("propertyId") REFERENCES properties(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payment_received_by FOREIGN KEY ("receivedBy") REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE payments IS 'Payment records for tax demands';
COMMENT ON COLUMN payments."chequeNumber" IS 'If payment mode is cheque or DD';
COMMENT ON COLUMN payments."transactionId" IS 'For online/card payments';
COMMENT ON COLUMN payments."razorpayOrderId" IS 'Razorpay order ID for online payments';
COMMENT ON COLUMN payments."razorpayPaymentId" IS 'Razorpay payment ID for online payments';
COMMENT ON COLUMN payments."razorpaySignature" IS 'Razorpay signature for payment verification';
COMMENT ON COLUMN payments."receivedBy" IS 'Cashier who received the payment';

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users("isActive");

-- Properties indexes
CREATE INDEX idx_properties_owner_id ON properties("ownerId");
CREATE INDEX idx_properties_ward_id ON properties("wardId");
CREATE INDEX idx_properties_property_number ON properties("propertyNumber");
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_pincode ON properties(pincode);

-- Assessments indexes
CREATE INDEX idx_assessments_property_id ON assessments("propertyId");
CREATE INDEX idx_assessments_assessor_id ON assessments("assessorId");
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_assessment_year ON assessments("assessmentYear");
CREATE INDEX idx_assessments_assessment_number ON assessments("assessmentNumber");

-- Demands indexes
CREATE INDEX idx_demands_property_id ON demands("propertyId");
CREATE INDEX idx_demands_assessment_id ON demands("assessmentId");
CREATE INDEX idx_demands_status ON demands(status);
CREATE INDEX idx_demands_due_date ON demands("dueDate");
CREATE INDEX idx_demands_financial_year ON demands("financialYear");
CREATE INDEX idx_demands_demand_number ON demands("demandNumber");

-- Payments indexes
CREATE INDEX idx_payments_demand_id ON payments("demandId");
CREATE INDEX idx_payments_property_id ON payments("propertyId");
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_date ON payments("paymentDate");
CREATE INDEX idx_payments_payment_mode ON payments("paymentMode");
CREATE INDEX idx_payments_received_by ON payments("receivedBy");

-- Wards indexes
CREATE INDEX idx_wards_collector_id ON wards("collectorId");
CREATE INDEX idx_wards_ward_number ON wards("wardNumber");

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_demands_updated_at BEFORE UPDATE ON demands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF SCHEMA
-- =====================================================
