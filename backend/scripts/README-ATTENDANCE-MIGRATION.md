# Collector Attendance Schema Migration

This migration adds the Collector Attendance system to your Supabase database.

## What This Migration Does

1. **Creates `collector_attendance` table** with all required fields:
   - Collector ID (foreign key to users)
   - Login/logout timestamps
   - Working duration (calculated automatically)
   - GPS location (latitude, longitude, address)
   - Device information (type, browser, OS, IP)
   - Source (web/mobile)

2. **Updates `audit_logs` table**:
   - Adds 'Attendance' to the `entityType` enum

3. **Creates indexes** for performance:
   - Index on collectorId
   - Index on loginAt
   - Composite index on (collectorId, loginAt)
   - Partial index for active sessions

4. **Creates database trigger**:
   - Prevents updates after logout (immutability)
   - Automatically calculates working duration on logout

## How to Run

### Option 1: Using Node Script (Recommended)

```bash
cd backend
npm run migrate-attendance
```

Make sure your `.env` file has `DATABASE_URL` set to your Supabase connection string.

### Option 2: Using Supabase SQL Editor

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `migrate-attendance-schema.sql`
4. Paste and run the SQL script

### Option 3: Using psql Command Line

```bash
psql $DATABASE_URL -f backend/scripts/migrate-attendance-schema.sql
```

## Verification

After running the migration, verify the table was created:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'collector_attendance';

-- Check if enum was updated
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'enum_audit_logs_entity_type'
);

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'collector_attendance';
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop the table (WARNING: This will delete all attendance data!)
DROP TABLE IF EXISTS collector_attendance CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS prevent_attendance_update_after_logout() CASCADE;

-- Note: Removing 'Attendance' from enum requires recreating the enum type
-- This is complex and not recommended unless absolutely necessary
```

## Important Notes

- ⚠️ **Data Safety**: This migration only creates the table structure. No existing data is affected.
- 🔒 **Immutability**: Once a record has `logoutAt` set, it cannot be updated (enforced by database trigger).
- 📊 **Indexes**: Indexes are created automatically for optimal query performance.
- 🔗 **Foreign Keys**: The table references the `users` table. Make sure your users table exists.

## Troubleshooting

### Error: "enum_audit_logs_entity_type does not exist"
This means your `audit_logs` table hasn't been created yet. Create the audit_logs table first, then run this migration.

### Error: "relation users does not exist"
Make sure your `users` table exists before running this migration.

### Error: "permission denied"
Make sure your database user has CREATE TABLE and CREATE INDEX permissions. In Supabase, this is usually handled automatically.

## Support

If you encounter any issues, check:
1. Your `DATABASE_URL` is correctly set
2. Your database user has necessary permissions
3. All prerequisite tables (users, audit_logs) exist
