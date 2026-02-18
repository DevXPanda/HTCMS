-- Multi-ULB Architecture Migration
-- Converts HTCMS from single-ULB to multi-ULB architecture
-- Run with: node run-migration.js
--
-- SAFETY FEATURES:
-- 1. Database backup is created automatically before migration
-- 2. Default ULB is created first
-- 3. All existing rows are updated with default ULB before applying NOT NULL constraint
-- 4. Verification step ensures no NULL values remain before constraints are applied
-- 5. Migration will FAIL if any NULL values are found (prevents data loss)

-- =============================================================================
-- Step 1: CREATE ULBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ulbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  state VARCHAR(100),
  district VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ulbs_status ON ulbs(status);
CREATE INDEX IF NOT EXISTS idx_ulbs_name ON ulbs(name);

-- =============================================================================
-- Step 2: INSERT DEFAULT ULB RECORD
-- =============================================================================

-- Insert default ULB (Municipal Corporation) and store ID in temp table
CREATE TEMP TABLE IF NOT EXISTS temp_default_ulb (ulb_id UUID);

DO $$
DECLARE
  default_ulb_id UUID;
BEGIN
  -- Check if default ULB already exists
  SELECT id INTO default_ulb_id FROM ulbs WHERE name = 'Municipal Corporation' LIMIT 1;
  
  -- If it doesn't exist, insert it
  IF default_ulb_id IS NULL THEN
    INSERT INTO ulbs (name, state, district, status)
    VALUES ('Municipal Corporation', NULL, NULL, 'ACTIVE')
    RETURNING id INTO default_ulb_id;
  END IF;
  
  -- Store in temporary table for use in subsequent steps
  DELETE FROM temp_default_ulb;
  INSERT INTO temp_default_ulb VALUES (default_ulb_id);
END$$;

-- =============================================================================
-- Step 3: ADD ULB_ID COLUMN TO TABLES
-- =============================================================================

-- Add ulb_id to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ulb_id UUID NULL;

-- Add ulb_id to wards table
ALTER TABLE wards
  ADD COLUMN IF NOT EXISTS ulb_id UUID NULL;

-- Add ulb_id to workers table
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS ulb_id UUID NULL;

-- Add ulb_id to worker_attendance table
ALTER TABLE worker_attendance
  ADD COLUMN IF NOT EXISTS ulb_id UUID NULL;

-- Add ulb_id to admin_management table (contractors are stored here)
ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS ulb_id UUID NULL;

-- =============================================================================
-- Step 4: UPDATE EXISTING RECORDS TO REFERENCE DEFAULT ULB
-- =============================================================================

-- Update all existing records to reference the default ULB
-- This ensures NO DATA LOSS - all existing rows get assigned to default ULB
DO $$
DECLARE
  default_ulb_id UUID;
  updated_count INTEGER;
BEGIN
  -- Get the default ULB ID
  SELECT ulb_id INTO default_ulb_id FROM temp_default_ulb LIMIT 1;
  
  IF default_ulb_id IS NULL THEN
    RAISE EXCEPTION 'Default ULB not found. Cannot proceed with data migration.';
  END IF;
  
  -- Update users table
  UPDATE users SET ulb_id = default_ulb_id WHERE ulb_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in users table', updated_count;
  
  -- Update wards table
  UPDATE wards SET ulb_id = default_ulb_id WHERE ulb_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in wards table', updated_count;
  
  -- Update workers table
  UPDATE workers SET ulb_id = default_ulb_id WHERE ulb_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in workers table', updated_count;
  
  -- Update worker_attendance table
  UPDATE worker_attendance SET ulb_id = default_ulb_id WHERE ulb_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in worker_attendance table', updated_count;
  
  -- Update admin_management table
  UPDATE admin_management SET ulb_id = default_ulb_id WHERE ulb_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % rows in admin_management table', updated_count;
END$$;

-- =============================================================================
-- Step 4.5: VERIFY ALL ROWS HAVE ULB_ID ASSIGNED
-- =============================================================================

-- Verify that all rows have been updated before applying NOT NULL constraint
-- This prevents data loss by ensuring no NULL values remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Check users table
  SELECT COUNT(*) INTO null_count FROM users WHERE ulb_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'users table has % rows with NULL ulb_id. Cannot proceed.', null_count;
  END IF;
  
  -- Check wards table
  SELECT COUNT(*) INTO null_count FROM wards WHERE ulb_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'wards table has % rows with NULL ulb_id. Cannot proceed.', null_count;
  END IF;
  
  -- Check workers table
  SELECT COUNT(*) INTO null_count FROM workers WHERE ulb_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'workers table has % rows with NULL ulb_id. Cannot proceed.', null_count;
  END IF;
  
  -- Check worker_attendance table
  SELECT COUNT(*) INTO null_count FROM worker_attendance WHERE ulb_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'worker_attendance table has % rows with NULL ulb_id. Cannot proceed.', null_count;
  END IF;
  
  -- Check admin_management table
  SELECT COUNT(*) INTO null_count FROM admin_management WHERE ulb_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'admin_management table has % rows with NULL ulb_id. Cannot proceed.', null_count;
  END IF;
  
  RAISE NOTICE '✅ Verification passed: All rows have ulb_id assigned';
END$$;

-- =============================================================================
-- Step 5: ADD FOREIGN KEY CONSTRAINTS AND SET NOT NULL
-- =============================================================================

-- Add foreign key constraints and set NOT NULL for operational tables
-- Using DO blocks to handle cases where constraints might already exist

-- Users table - make ulb_id NOT NULL
DO $$
BEGIN
  ALTER TABLE users ALTER COLUMN ulb_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Column might already be NOT NULL, ignore error
  NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_ulb_id'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_ulb_id FOREIGN KEY (ulb_id) REFERENCES ulbs(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Wards table - make ulb_id NOT NULL
DO $$
BEGIN
  ALTER TABLE wards ALTER COLUMN ulb_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_wards_ulb_id'
  ) THEN
    ALTER TABLE wards
      ADD CONSTRAINT fk_wards_ulb_id FOREIGN KEY (ulb_id) REFERENCES ulbs(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Workers table - make ulb_id NOT NULL
DO $$
BEGIN
  ALTER TABLE workers ALTER COLUMN ulb_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_workers_ulb_id'
  ) THEN
    ALTER TABLE workers
      ADD CONSTRAINT fk_workers_ulb_id FOREIGN KEY (ulb_id) REFERENCES ulbs(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Worker_attendance table - make ulb_id NOT NULL
DO $$
BEGIN
  ALTER TABLE worker_attendance ALTER COLUMN ulb_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_worker_attendance_ulb_id'
  ) THEN
    ALTER TABLE worker_attendance
      ADD CONSTRAINT fk_worker_attendance_ulb_id FOREIGN KEY (ulb_id) REFERENCES ulbs(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- Admin_management table - make ulb_id NOT NULL
DO $$
BEGIN
  ALTER TABLE admin_management ALTER COLUMN ulb_id SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_management_ulb_id'
  ) THEN
    ALTER TABLE admin_management
      ADD CONSTRAINT fk_admin_management_ulb_id FOREIGN KEY (ulb_id) REFERENCES ulbs(id) ON DELETE RESTRICT;
  END IF;
END$$;

-- =============================================================================
-- Step 6: ADD INDEXES ON ULB_ID, WARD_ID, EO_ID
-- =============================================================================

-- Indexes on ulb_id columns
CREATE INDEX IF NOT EXISTS idx_users_ulb_id ON users(ulb_id);
CREATE INDEX IF NOT EXISTS idx_wards_ulb_id ON wards(ulb_id);
CREATE INDEX IF NOT EXISTS idx_workers_ulb_id ON workers(ulb_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_ulb_id ON worker_attendance(ulb_id);
CREATE INDEX IF NOT EXISTS idx_admin_management_ulb_id ON admin_management(ulb_id);

-- Ensure indexes exist on ward_id (some may already exist)
CREATE INDEX IF NOT EXISTS idx_users_ward_id ON users(ward_id);
CREATE INDEX IF NOT EXISTS idx_wards_id ON wards(id);
CREATE INDEX IF NOT EXISTS idx_workers_ward_id ON workers(ward_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_ward_id ON worker_attendance(ward_id);
CREATE INDEX IF NOT EXISTS idx_admin_management_ward_id ON admin_management(ward_id);

-- Ensure indexes exist on eo_id (some may already exist)
CREATE INDEX IF NOT EXISTS idx_users_eo_id ON users(eo_id);
CREATE INDEX IF NOT EXISTS idx_workers_eo_id ON workers(eo_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_eo_id ON worker_attendance(eo_id);
CREATE INDEX IF NOT EXISTS idx_admin_management_eo_id ON admin_management(eo_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workers_ulb_ward ON workers(ulb_id, ward_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_ulb_ward ON worker_attendance(ulb_id, ward_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_ulb_eo ON worker_attendance(ulb_id, eo_id);
CREATE INDEX IF NOT EXISTS idx_users_ulb_ward ON users(ulb_id, ward_id);

-- Clean up temporary table
DROP TABLE IF EXISTS temp_default_ulb;
