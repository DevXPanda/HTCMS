-- =====================================================
-- HTCMS - Fix water_connections table: Add isMetered column
-- =====================================================
-- This script adds the missing isMetered column to water_connections table
-- Run this if the table was created before the isMetered column was added
-- =====================================================

-- Add isMetered column if it doesn't exist
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'water_connections' 
        AND column_name = 'isMetered'
    ) THEN
        -- Add the column
        ALTER TABLE water_connections 
        ADD COLUMN "isMetered" BOOLEAN NOT NULL DEFAULT false;
        
        -- Add comment
        COMMENT ON COLUMN water_connections."isMetered" IS 'Whether the connection has a meter';
        
        RAISE NOTICE 'Added isMetered column to water_connections table';
    ELSE
        RAISE NOTICE 'isMetered column already exists in water_connections table';
    END IF;
END $$;

-- =====================================================
-- Fix Complete!
-- =====================================================
