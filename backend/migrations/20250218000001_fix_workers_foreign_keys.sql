-- Fix Workers Table Foreign Keys
-- The supervisor_id, eo_id, and contractor_id should reference admin_management table, not users table
-- Run this migration to fix the foreign key constraints

-- Drop existing foreign key constraints that point to users table
DO $$
BEGIN
  -- Drop supervisor_id foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_supervisor_id_fkey' 
    AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers DROP CONSTRAINT workers_supervisor_id_fkey;
  END IF;

  -- Drop eo_id foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_eo_id_fkey' 
    AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers DROP CONSTRAINT workers_eo_id_fkey;
  END IF;

  -- Drop contractor_id foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_contractor_id_fkey' 
    AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers DROP CONSTRAINT workers_contractor_id_fkey;
  END IF;
END$$;

-- Create new foreign key constraints pointing to admin_management table
DO $$
BEGIN
  -- Add supervisor_id foreign key to admin_management
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_supervisor_id_fkey' 
    AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers
      ADD CONSTRAINT workers_supervisor_id_fkey 
      FOREIGN KEY (supervisor_id) 
      REFERENCES admin_management(id) 
      ON DELETE SET NULL;
  END IF;

  -- Add eo_id foreign key to admin_management
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_eo_id_fkey' 
    AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers
      ADD CONSTRAINT workers_eo_id_fkey 
      FOREIGN KEY (eo_id) 
      REFERENCES admin_management(id) 
      ON DELETE SET NULL;
  END IF;

  -- Add contractor_id foreign key to admin_management
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_contractor_id_fkey' 
    AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers
      ADD CONSTRAINT workers_contractor_id_fkey 
      FOREIGN KEY (contractor_id) 
      REFERENCES admin_management(id) 
      ON DELETE SET NULL;
  END IF;
END$$;

-- Also fix worker_attendance table foreign keys
DO $$
BEGIN
  -- Drop supervisor_id foreign key from worker_attendance if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'worker_attendance_supervisor_id_fkey' 
    AND conrelid = 'worker_attendance'::regclass
  ) THEN
    ALTER TABLE worker_attendance DROP CONSTRAINT worker_attendance_supervisor_id_fkey;
  END IF;

  -- Drop eo_id foreign key from worker_attendance if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'worker_attendance_eo_id_fkey' 
    AND conrelid = 'worker_attendance'::regclass
  ) THEN
    ALTER TABLE worker_attendance DROP CONSTRAINT worker_attendance_eo_id_fkey;
  END IF;
END$$;

-- Create new foreign key constraints for worker_attendance pointing to admin_management
DO $$
BEGIN
  -- Add supervisor_id foreign key to admin_management
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'worker_attendance_supervisor_id_fkey' 
    AND conrelid = 'worker_attendance'::regclass
  ) THEN
    ALTER TABLE worker_attendance
      ADD CONSTRAINT worker_attendance_supervisor_id_fkey 
      FOREIGN KEY (supervisor_id) 
      REFERENCES admin_management(id) 
      ON DELETE SET NULL;
  END IF;

  -- Add eo_id foreign key to admin_management
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'worker_attendance_eo_id_fkey' 
    AND conrelid = 'worker_attendance'::regclass
  ) THEN
    ALTER TABLE worker_attendance
      ADD CONSTRAINT worker_attendance_eo_id_fkey 
      FOREIGN KEY (eo_id) 
      REFERENCES admin_management(id) 
      ON DELETE SET NULL;
  END IF;
END$$;
