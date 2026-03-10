-- Add assigned_modules column for Supervisor role (Toilet Management, MRF, Gau Shala)
-- Run this if your database was created before this feature.
ALTER TABLE admin_management
ADD COLUMN IF NOT EXISTS assigned_modules TEXT[] DEFAULT '{}';

COMMENT ON COLUMN admin_management.assigned_modules IS 'Supervisor only: assigned module keys e.g. toilet, mrf, gaushala';
