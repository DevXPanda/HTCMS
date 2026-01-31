-- Migration script to add accountHolderName column to payments table
-- This is for field collection functionality

-- Add accountHolderName column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'accountHolderName'
    ) THEN
        ALTER TABLE payments ADD COLUMN "accountHolderName" VARCHAR(100);
        COMMENT ON COLUMN payments."accountHolderName" IS 'Account holder name for all payment modes';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name = 'accountHolderName'
ORDER BY column_name;
