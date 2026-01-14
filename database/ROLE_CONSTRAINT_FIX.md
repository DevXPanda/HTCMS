# Fix Role Constraint Error

## Problem
When registering a user with `role: "collector"`, you get this error:
```
new row for relation "users" violates check constraint "users_role_check"
```

This happens because the database CHECK constraint doesn't include `'collector'` in the allowed values.

## Solution

### ⚠️ IMPORTANT: Database Permissions Required

You need to run the SQL commands as a database superuser or the table owner. The application database user typically doesn't have permission to alter table constraints.

### Option 1: Run SQL Manually (Recommended)

**Connect to your PostgreSQL database as a superuser (usually `postgres` user) and run:**

```sql
-- Drop the old constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 'collector'
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'assessor', 'cashier', 'collector', 'tax_collector', 'citizen'));
```

**How to connect:**
- Using psql: `psql -U postgres -d your_database_name`
- Using pgAdmin: Connect as postgres user, then run the SQL in Query Tool
- Using any PostgreSQL client: Connect with superuser credentials

### Option 2: Run the Node.js Script (If you have permissions)

If your database user has ALTER TABLE permissions:

```bash
cd backend
npm run fix-role-constraint
```

**Note:** This will fail if your database user doesn't have permission to alter the table.

### Option 3: If Using ENUM Type

If your database uses ENUM type instead of CHECK constraint:

```sql
-- First, find your enum type name
SELECT t.typname, e.enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%role%';

-- Then add 'collector' to it (replace 'your_enum_type_name' with actual name)
ALTER TYPE your_enum_type_name ADD VALUE IF NOT EXISTS 'collector';
```

## Verification

After running the fix, test by registering a new user with `role: "collector"`. The registration should succeed without errors.

## Quick Fix Steps

1. Open your PostgreSQL client (pgAdmin, DBeaver, psql, etc.)
2. Connect as `postgres` user (or database owner)
3. Select your database
4. Run this SQL:
   ```sql
   ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
   ALTER TABLE users ADD CONSTRAINT users_role_check 
   CHECK (role IN ('admin', 'assessor', 'cashier', 'collector', 'tax_collector', 'citizen'));
   ```
5. Test registration with `role: "collector"`

## Notes

- The Sequelize model has been updated to include `'collector'` in the ENUM
- Both `'collector'` and `'tax_collector'` are supported for collector roles
- The database constraint must match the Sequelize model definition
- You must run the SQL as a database superuser or table owner
