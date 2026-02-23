-- Drop legacy camelCase columns from ward_sequences (Sequelize uses snake_case via field mapping)
-- Run with: node run-migration.js

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ward_sequences') THEN
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS "moduleKey";
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS "wardId";
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS "lastSequence";
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS modulekey;
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS wardid;
    ALTER TABLE ward_sequences DROP COLUMN IF EXISTS lastsequence;
  END IF;
END $$;
