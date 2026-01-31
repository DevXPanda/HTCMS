-- Migration script to add proofUrl and collectedBy columns to payments table
-- This is for field collection functionality

-- Add proofUrl column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'proofUrl'
    ) THEN
        ALTER TABLE payments ADD COLUMN "proofUrl" VARCHAR(500);
        COMMENT ON COLUMN payments."proofUrl" IS 'URL to payment proof document (for field collections)';
    END IF;
END $$;

-- Add collectedBy column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'collectedBy'
    ) THEN
        ALTER TABLE payments ADD COLUMN "collectedBy" INTEGER;
        ALTER TABLE payments ADD CONSTRAINT payments_collectedBy_fkey 
        FOREIGN KEY ("collectedBy") REFERENCES "users" ("id") ON DELETE SET NULL;
        COMMENT ON COLUMN payments."collectedBy" IS 'Collector who collected the payment in field';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('proofUrl', 'collectedBy')
ORDER BY column_name;
