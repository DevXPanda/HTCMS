-- Add SFI (Sanitary & Food Inspector) role to admin_management
-- Run this once. To find enum type: SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_management' AND column_name = 'role';

DO $$
DECLARE
  enum_type_name text;
BEGIN
  SELECT udt_name INTO enum_type_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'admin_management' AND column_name = 'role';

  IF enum_type_name IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = enum_type_name AND e.enumlabel = 'SFI'
    ) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE ''SFI''', enum_type_name);
    END IF;
  END IF;
END $$;

-- Add 'sfi' to audit_logs actor_role enum (for SFI activity visibility to admin/super_admin)
DO $$
DECLARE
  audit_enum_name text;
BEGIN
  SELECT udt_name INTO audit_enum_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'actor_role';

  IF audit_enum_name IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = audit_enum_name AND e.enumlabel = 'sfi'
    ) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE ''sfi''', audit_enum_name);
    END IF;
  END IF;
END $$;

-- If table uses a CHECK constraint on role (e.g. admin_management_role_check), update it to allow SFI
ALTER TABLE admin_management
  DROP CONSTRAINT IF EXISTS admin_management_role_check,
  ADD CONSTRAINT admin_management_role_check CHECK (role IN (
    'CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN', 'SFI'
  ));
