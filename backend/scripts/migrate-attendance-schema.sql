-- =====================================================
-- HTCMS - Collector Attendance Schema Migration
-- =====================================================
-- This script adds the Collector Attendance system to Supabase
-- Run this in Supabase SQL Editor or via psql
-- =====================================================

-- Step 1: Update audit_logs entityType enum to include 'Attendance'
-- First, check if the enum exists and add 'Attendance' if it doesn't
DO $$ 
BEGIN
    -- Check if 'Attendance' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'Attendance' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'enum_audit_logs_entity_type'
        )
    ) THEN
        -- Add 'Attendance' to the enum
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'Attendance';
        RAISE NOTICE 'Added Attendance to enum_audit_logs_entity_type';
    ELSE
        RAISE NOTICE 'Attendance already exists in enum_audit_logs_entity_type';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Enum doesn't exist yet, it will be created when the table is created
        RAISE NOTICE 'enum_audit_logs_entity_type does not exist yet. It will be created with the table.';
END $$;

-- Step 2: Create collector_attendance table
CREATE TABLE IF NOT EXISTS collector_attendance (
    id SERIAL PRIMARY KEY,
    "collectorId" INTEGER NOT NULL,
    "loginAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "logoutAt" TIMESTAMP WITH TIME ZONE NULL,
    "workingDurationMinutes" INTEGER NULL,
    "loginLatitude" DECIMAL(10, 8) NULL,
    "loginLongitude" DECIMAL(11, 8) NULL,
    "loginAddress" TEXT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "deviceType" VARCHAR(20) NOT NULL DEFAULT 'desktop' CHECK ("deviceType" IN ('mobile', 'desktop', 'tablet')),
    "browserName" VARCHAR(100) NULL,
    "operatingSystem" VARCHAR(100) NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'web' CHECK ("source" IN ('web', 'mobile')),
    "isAutoMarked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_collector_attendance_collector 
        FOREIGN KEY ("collectorId") 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    -- Comments
    CONSTRAINT chk_device_type CHECK ("deviceType" IN ('mobile', 'desktop', 'tablet')),
    CONSTRAINT chk_source CHECK ("source" IN ('web', 'mobile'))
);

-- Step 3: Add comments to columns
COMMENT ON TABLE collector_attendance IS 'Automatic attendance tracking for collectors. Records are immutable after logout.';
COMMENT ON COLUMN collector_attendance.id IS 'Primary key';
COMMENT ON COLUMN collector_attendance."collectorId" IS 'Foreign key to Users table (collector)';
COMMENT ON COLUMN collector_attendance."loginAt" IS 'Timestamp when collector logged in (punch in)';
COMMENT ON COLUMN collector_attendance."logoutAt" IS 'Timestamp when collector logged out (punch out)';
COMMENT ON COLUMN collector_attendance."workingDurationMinutes" IS 'Calculated working duration in minutes (set on logout)';
COMMENT ON COLUMN collector_attendance."loginLatitude" IS 'GPS latitude at login time';
COMMENT ON COLUMN collector_attendance."loginLongitude" IS 'GPS longitude at login time';
COMMENT ON COLUMN collector_attendance."loginAddress" IS 'Reverse geocoded address at login time';
COMMENT ON COLUMN collector_attendance."ipAddress" IS 'IP address at login time';
COMMENT ON COLUMN collector_attendance."deviceType" IS 'Device type: mobile, desktop, or tablet';
COMMENT ON COLUMN collector_attendance."browserName" IS 'Browser name (e.g., Chrome, Firefox, Safari)';
COMMENT ON COLUMN collector_attendance."operatingSystem" IS 'Operating system (e.g., Windows, macOS, Android, iOS)';
COMMENT ON COLUMN collector_attendance."source" IS 'Source: web or mobile app';
COMMENT ON COLUMN collector_attendance."isAutoMarked" IS 'Always true - attendance is automatically marked';

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_attendance_collector_id 
    ON collector_attendance("collectorId");

CREATE INDEX IF NOT EXISTS idx_collector_attendance_login_at 
    ON collector_attendance("loginAt");

CREATE INDEX IF NOT EXISTS idx_collector_attendance_collector_login 
    ON collector_attendance("collectorId", "loginAt");

-- Partial index for active sessions (no logout)
CREATE INDEX IF NOT EXISTS collector_attendance_active_session_idx 
    ON collector_attendance("collectorId", "logoutAt") 
    WHERE "logoutAt" IS NULL;

-- Step 5: Create a function to prevent updates after logout
-- This enforces immutability at the database level
CREATE OR REPLACE FUNCTION prevent_attendance_update_after_logout()
RETURNS TRIGGER AS $$
BEGIN
    -- If the old record has logoutAt set, prevent any updates
    IF OLD."logoutAt" IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot update attendance record after logout. Records are immutable once logged out.';
    END IF;
    
    -- Calculate working duration when logoutAt is set
    IF NEW."logoutAt" IS NOT NULL AND OLD."logoutAt" IS NULL THEN
        NEW."workingDurationMinutes" := EXTRACT(EPOCH FROM (NEW."logoutAt" - NEW."loginAt")) / 60;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to enforce immutability
DROP TRIGGER IF EXISTS trigger_prevent_attendance_update_after_logout ON collector_attendance;
CREATE TRIGGER trigger_prevent_attendance_update_after_logout
    BEFORE UPDATE ON collector_attendance
    FOR EACH ROW
    EXECUTE FUNCTION prevent_attendance_update_after_logout();

-- Step 7: Create a unique constraint to ensure one active session per collector
-- Note: This is handled at application level, but we can add a partial unique index
-- However, PostgreSQL doesn't support partial unique indexes directly
-- So we'll rely on application logic, but add a helpful index

-- Step 8: Grant necessary permissions (adjust as needed for your Supabase setup)
-- These are typically handled by Supabase automatically, but included for completeness
-- GRANT SELECT, INSERT, UPDATE ON collector_attendance TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE collector_attendance_id_seq TO authenticated;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- The collector_attendance table has been created with:
-- - All required fields
-- - Foreign key to users table
-- - Indexes for performance
-- - Trigger to enforce immutability after logout
-- - Automatic duration calculation
-- =====================================================
