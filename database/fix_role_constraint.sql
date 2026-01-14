-- Fix users table role constraint to include 'collector'
-- Run this SQL as a database superuser (postgres user) or table owner
-- 
-- This script updates the CHECK constraint on the users.role column
-- to include 'collector' as a valid role value

-- Step 1: Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add new constraint that includes 'collector' (lowercase only)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'assessor', 'cashier', 'collector', 'citizen'));

-- Verification: Check that the constraint was created correctly
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_role_check';
