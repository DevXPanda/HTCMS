-- Normalize all user roles to lowercase
-- This script converts all existing roles in the database to lowercase
-- and maps 'tax_collector' to 'collector' for consistency

-- First, update all roles to lowercase
UPDATE users 
SET role = LOWER(TRIM(role))
WHERE role IS NOT NULL;

-- Map 'tax_collector' to 'collector' for backward compatibility
UPDATE users 
SET role = 'collector'
WHERE LOWER(TRIM(role)) = 'tax_collector';

-- Verify the update
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- Note: After running this script, you may need to update the database constraint
-- if it doesn't allow lowercase roles. The constraint should be:
-- CHECK (role IN ('admin', 'assessor', 'cashier', 'collector', 'citizen'))
