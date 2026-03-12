-- Fix admin_management_role_check to allow 'SFI'
-- The table has a CHECK constraint that was not updated when we added the enum value.
-- Drop and recreate the constraint to include SFI.

ALTER TABLE admin_management
  DROP CONSTRAINT IF EXISTS admin_management_role_check,
  ADD CONSTRAINT admin_management_role_check CHECK (role IN (
    'CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN', 'SFI'
  ));
