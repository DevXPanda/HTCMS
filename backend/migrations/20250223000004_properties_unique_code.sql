-- Add unique_code to properties: system-generated ID (e.g. PR0230055), always set on create.
-- property_number = admin reference (e.g. 94) or same as unique_code when not provided.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS unique_code VARCHAR(50) UNIQUE NULL;

COMMENT ON COLUMN properties.unique_code IS 'System-generated unique ID (e.g. PR0230055); always set on create';
