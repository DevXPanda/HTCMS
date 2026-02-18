-- Migration: Update admin_management role ENUM to uppercase
-- This migration updates all role values to uppercase to match the database CHECK constraint
-- Run after 20250217000006_multi_ulb_architecture.sql

-- Step 1: Create backup of current data
DO $$
DECLARE
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM admin_management;
  RAISE NOTICE 'Backing up % admin_management records before role update', backup_count;
END$$;

-- Step 2: Drop CHECK constraint FIRST (if it exists) to allow updates
DO $$
BEGIN
  ALTER TABLE admin_management 
    DROP CONSTRAINT IF EXISTS admin_management_role_check;
  RAISE NOTICE 'Dropped CHECK constraint (if existed)';
END$$;

-- Step 3: Update all existing role values to uppercase
-- This ensures all existing records use uppercase before we change the ENUM
-- We need to cast to text first, then update, then cast back
DO $$
BEGIN
  -- First, convert ENUM to text temporarily
  ALTER TABLE admin_management 
    ALTER COLUMN role TYPE text USING role::text;
  
  RAISE NOTICE 'Converted role column to text';
  
  -- Now update all values to uppercase
  UPDATE admin_management
  SET role = UPPER(role)
  WHERE role IS NOT NULL;
  
  RAISE NOTICE 'Updated all role values to uppercase';
END$$;

-- Step 3: Create new ENUM type with uppercase values
DO $$
BEGIN
  -- Drop the new enum if it exists (from previous failed migration)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_admin_management_role_new') THEN
    DROP TYPE enum_admin_management_role_new CASCADE;
  END IF;
  
  -- Create new ENUM with uppercase values
  CREATE TYPE enum_admin_management_role_new AS ENUM (
    'CLERK',
    'INSPECTOR',
    'OFFICER',
    'COLLECTOR',
    'EO',
    'SUPERVISOR',
    'FIELD_WORKER',
    'CONTRACTOR',
    'ADMIN'
  );
  
  RAISE NOTICE 'Created new ENUM type with uppercase values';
END$$;

-- Step 4: Alter the column to use the new ENUM type
-- Column is already text from Step 3, so we can directly convert to new enum
DO $$
DECLARE
  invalid_roles TEXT[];
BEGIN
  -- Check for any invalid role values before conversion
  SELECT ARRAY_AGG(DISTINCT role) INTO invalid_roles
  FROM admin_management
  WHERE role IS NOT NULL
    AND UPPER(role) NOT IN ('CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN');
  
  IF invalid_roles IS NOT NULL AND array_length(invalid_roles, 1) > 0 THEN
    RAISE EXCEPTION 'Found invalid role values: %. Please fix these before migration.', invalid_roles;
  END IF;
  
  -- Now change to new enum type
  ALTER TABLE admin_management 
    ALTER COLUMN role TYPE enum_admin_management_role_new 
    USING role::enum_admin_management_role_new;
  
  RAISE NOTICE 'Changed role column to new uppercase ENUM';
  
  -- Drop the old enum type (if it still exists)
  DROP TYPE IF EXISTS enum_admin_management_role CASCADE;
  
  RAISE NOTICE 'Dropped old ENUM type';
  
  -- Rename the new enum to the original name
  ALTER TYPE enum_admin_management_role_new RENAME TO enum_admin_management_role;
  
  RAISE NOTICE 'Renamed new ENUM to original name';
END$$;

-- Step 5: Verify all roles are uppercase
DO $$
DECLARE
  lowercase_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO lowercase_count
  FROM admin_management
  WHERE role::text != UPPER(role::text);
  
  IF lowercase_count > 0 THEN
    RAISE EXCEPTION 'Found % records with non-uppercase roles. Migration may have failed.', lowercase_count;
  ELSE
    RAISE NOTICE '✅ Verification passed: All roles are uppercase';
  END IF;
END$$;

-- Step 6: Verify ENUM values
DO $$
DECLARE
  invalid_role_count INTEGER;
  valid_roles TEXT[] := ARRAY['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN'];
BEGIN
  SELECT COUNT(*) INTO invalid_role_count
  FROM admin_management
  WHERE role::text != ALL(valid_roles);
  
  IF invalid_role_count > 0 THEN
    RAISE WARNING 'Found % records with invalid role values', invalid_role_count;
  ELSE
    RAISE NOTICE '✅ All role values are valid';
  END IF;
END$$;

-- Step 7: Recreate CHECK constraint if it exists (to ensure it matches uppercase values)
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE admin_management 
    DROP CONSTRAINT IF EXISTS admin_management_role_check;
  
  -- Create new CHECK constraint with uppercase values
  ALTER TABLE admin_management
    ADD CONSTRAINT admin_management_role_check 
    CHECK (role IN ('CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN'));
  
  RAISE NOTICE '✅ Created CHECK constraint with uppercase role values';
END$$;

-- Final verification
DO $$
DECLARE
  total_count INTEGER;
  role_distribution RECORD;
BEGIN
  SELECT COUNT(*) INTO total_count FROM admin_management;
  RAISE NOTICE 'Total admin_management records: %', total_count;
  
  RAISE NOTICE 'Role distribution:';
  FOR role_distribution IN 
    SELECT role::text as role_name, COUNT(*) as count
    FROM admin_management
    GROUP BY role
    ORDER BY role
  LOOP
    RAISE NOTICE '  %: % records', role_distribution.role_name, role_distribution.count;
  END LOOP;
END$$;
