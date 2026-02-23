-- Drop legacy moduleType column from ward_sequences (model uses module_key)
-- Run with: node run-migration.js

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ward_sequences') THEN
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS "moduleType";
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS moduletype;
  END IF;
END $$;
