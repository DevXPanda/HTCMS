-- Admin Management: dynamic role-based fields and new roles (EO, SUPERVISOR, FIELD_WORKER, CONTRACTOR)
-- Run after 20250217000001_field_worker_management_schema.sql

-- Add new role enum values to admin_management (Sequelize: enum_admin_management_role)
DO $$
DECLARE
  r text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_admin_management_role') THEN
    FOREACH r IN ARRAY ARRAY['eo', 'supervisor', 'field_worker', 'contractor'] LOOP
      BEGIN
        EXECUTE format('ALTER TYPE enum_admin_management_role ADD VALUE %L', r);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END LOOP;
  END IF;
END$$;

-- Role-based columns (all nullable for backward compatibility)
ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS assigned_ulb VARCHAR(255) NULL;

ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS ward_id INTEGER NULL REFERENCES wards(id) ON DELETE SET NULL;

ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS eo_id INTEGER NULL REFERENCES admin_management(id) ON DELETE SET NULL;

ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS contractor_id INTEGER NULL REFERENCES admin_management(id) ON DELETE SET NULL;

ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS worker_type VARCHAR(20) NULL;

ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS supervisor_id INTEGER NULL REFERENCES admin_management(id) ON DELETE SET NULL;

ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) NULL;

ALTER TABLE admin_management
  ADD COLUMN IF NOT EXISTS contact_details TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_management_ward_id ON admin_management(ward_id);
CREATE INDEX IF NOT EXISTS idx_admin_management_eo_id ON admin_management(eo_id);
CREATE INDEX IF NOT EXISTS idx_admin_management_supervisor_id ON admin_management(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_admin_management_contractor_id ON admin_management(contractor_id);
