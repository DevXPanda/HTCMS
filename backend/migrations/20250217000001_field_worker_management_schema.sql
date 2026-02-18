-- Field Worker Management Schema Migration
-- Run this against your PostgreSQL database (e.g. psql $DATABASE_URL -f this file)
-- Or use: node -e "require('dotenv').config(); const { pool } = require('./db.js'); ..."

-- =============================================================================
-- 1. EXTEND USERS TABLE: new role values, ward_id, eo_id, contractor_id
-- =============================================================================

-- Add new role enum values (lowercase to match existing app: admin, assessor, etc.)
-- Sequelize creates enum type as enum_<tableName>_<columnName> -> enum_users_role
DO $$
DECLARE
  r text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_role') THEN
    FOREACH r IN ARRAY ARRAY['eo', 'supervisor', 'field_worker', 'contractor'] LOOP
      BEGIN
        EXECUTE format('ALTER TYPE enum_users_role ADD VALUE %L', r);
      EXCEPTION WHEN duplicate_object THEN
        NULL; -- value already exists
      END;
    END LOOP;
  END IF;
END$$;

-- If role column is VARCHAR (no enum), the above is a no-op; ensure column accepts new values
-- Add ward_id (nullable FK -> wards)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ward_id INTEGER NULL
  REFERENCES wards(id) ON DELETE SET NULL;

-- Add eo_id (nullable FK -> users, for EO reporting)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS eo_id INTEGER NULL
  REFERENCES users(id) ON DELETE SET NULL;

-- Add contractor_id (nullable FK -> users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contractor_id INTEGER NULL
  REFERENCES users(id) ON DELETE SET NULL;

-- Indexes on new user columns for lookups
CREATE INDEX IF NOT EXISTS idx_users_ward_id ON users(ward_id);
CREATE INDEX IF NOT EXISTS idx_users_eo_id ON users(eo_id);
CREATE INDEX IF NOT EXISTS idx_users_contractor_id ON users(contractor_id);

-- =============================================================================
-- 2. CREATE WORKERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  worker_type VARCHAR(20) NOT NULL CHECK (worker_type IN ('ULB', 'CONTRACTUAL')),
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  supervisor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  eo_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  contractor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_ward_id ON workers(ward_id);
CREATE INDEX IF NOT EXISTS idx_workers_eo_id ON workers(eo_id);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(id);
CREATE INDEX IF NOT EXISTS idx_workers_supervisor_id ON workers(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_workers_contractor_id ON workers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);

-- =============================================================================
-- 3. CREATE WORKER_ATTENDANCE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS worker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  supervisor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  eo_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL,
  checkin_time TIMESTAMP WITH TIME ZONE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photo_url VARCHAR(500),
  geo_status VARCHAR(20) CHECK (geo_status IN ('VALID', 'OUTSIDE_WARD')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes as requested: ward_id, eo_id, worker_id, attendance_date
CREATE INDEX IF NOT EXISTS idx_worker_attendance_ward_id ON worker_attendance(ward_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_eo_id ON worker_attendance(eo_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_worker_id ON worker_attendance(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_attendance_date ON worker_attendance(attendance_date);
-- Composite for common queries (worker + date, ward + date)
CREATE INDEX IF NOT EXISTS idx_worker_attendance_worker_date ON worker_attendance(worker_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_worker_attendance_ward_date ON worker_attendance(ward_id, attendance_date);
