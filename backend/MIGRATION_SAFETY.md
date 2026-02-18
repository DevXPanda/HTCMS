# Multi-ULB Migration Safety Guide

## Overview
This migration converts HTCMS from single-ULB to multi-ULB architecture with **zero data loss** guarantees.

## Safety Features

### 1. Automatic Database Backup
- **Before migration starts**: Full database backup is created automatically
- **Backup location**: `backend/backups/backup_YYYY-MM-DDTHH-MM-SS.sql`
- **Backup method**: Uses `pg_dump` if available, falls back to SQL export
- **Restore command**: `psql <database> < backup_file.sql`

### 2. Migration Order (Ensures No Data Loss)

#### Step 1: Create ULBs Table
- Creates `ulbs` table if it doesn't exist
- Safe to run multiple times (idempotent)

#### Step 2: Create Default ULB Entry
- Inserts "Municipal Corporation" as default ULB
- Checks if it already exists (prevents duplicates)
- Stores ULB ID in temporary table for subsequent steps

#### Step 3: Add ulb_id Columns (NULLABLE)
- Adds `ulb_id` column to all tables as **NULLABLE**
- This allows existing rows to remain unchanged initially
- Safe operation - no data modification

#### Step 4: Update All Existing Rows
- **CRITICAL STEP**: Updates ALL existing rows with default ULB ID
- Tables updated:
  - `users`
  - `wards`
  - `workers`
  - `worker_attendance`
  - `admin_management`
- Uses transaction-safe UPDATE statements
- Logs count of updated rows for verification

#### Step 4.5: Verification (Prevents Data Loss)
- **VERIFIES** that all rows have been updated
- Checks each table for NULL `ulb_id` values
- **FAILS MIGRATION** if any NULL values found
- Prevents applying NOT NULL constraint on rows with NULL values

#### Step 5: Apply NOT NULL Constraints
- Only runs if verification passes
- Sets `ulb_id` to NOT NULL for all tables
- Adds foreign key constraints
- Safe because all rows already have `ulb_id` assigned

#### Step 6: Create Indexes
- Creates indexes for performance
- Safe operation - can run multiple times

## Running the Migration

### Prerequisites
1. **Database backup** (automatic, but verify it was created)
2. **PostgreSQL client tools** (`pg_dump` recommended for full backup)
3. **DATABASE_URL** in `.env` file

### Command
```bash
cd backend
node run-migration.js
```

### Expected Output
```
📦 Creating database backup...
✅ Backup created: backups/backup_2025-02-17T10-30-00.sql
   Size: 1234.56 KB

🚀 Starting migrations...

📄 Processing: 20250217000001_field_worker_management_schema.sql
   ✅ 20250217000001_field_worker_management_schema.sql completed
...

📄 Processing: 20250217000006_multi_ulb_architecture.sql
   ⚠️  Multi-ULB migration detected - will verify data before applying constraints
   ✅ 20250217000006_multi_ulb_architecture.sql completed

🔍 Verifying all rows have ulb_id assigned...
   ✅ users: All rows have ulb_id
   ✅ wards: All rows have ulb_id
   ✅ workers: All rows have ulb_id
   ✅ worker_attendance: All rows have ulb_id
   ✅ admin_management: All rows have ulb_id
✅ Verification passed: All rows have ulb_id assigned

✅ All migrations completed successfully!
📦 Backup saved at: backups/backup_2025-02-17T10-30-00.sql
```

## Error Handling

### If Migration Fails
1. **Check backup file**: Located in `backend/backups/`
2. **Review error message**: Will indicate which step failed
3. **Common issues**:
   - NULL values found → Default ULB creation failed
   - Constraint violation → Foreign key already exists
   - Connection error → Database unavailable

### Restore from Backup
```bash
# Restore database from backup
psql $DATABASE_URL < backups/backup_YYYY-MM-DDTHH-MM-SS.sql

# Or using connection string
psql postgresql://user:password@host:port/database < backups/backup_file.sql
```

## Verification Checklist

After migration, verify:
- [ ] Backup file was created successfully
- [ ] All tables have `ulb_id` column
- [ ] All existing rows have `ulb_id` assigned (no NULL values)
- [ ] Default ULB "Municipal Corporation" exists
- [ ] Foreign key constraints are in place
- [ ] Indexes are created
- [ ] Application still works correctly

## Manual Verification Queries

```sql
-- Check default ULB exists
SELECT * FROM ulbs WHERE name = 'Municipal Corporation';

-- Verify no NULL ulb_id values
SELECT 
  'users' as table_name, COUNT(*) as null_count 
FROM users WHERE ulb_id IS NULL
UNION ALL
SELECT 'wards', COUNT(*) FROM wards WHERE ulb_id IS NULL
UNION ALL
SELECT 'workers', COUNT(*) FROM workers WHERE ulb_id IS NULL
UNION ALL
SELECT 'worker_attendance', COUNT(*) FROM worker_attendance WHERE ulb_id IS NULL
UNION ALL
SELECT 'admin_management', COUNT(*) FROM admin_management WHERE ulb_id IS NULL;

-- Should return 0 for all tables
```

## Rollback Plan

If migration needs to be rolled back:

1. **Stop application** to prevent new data
2. **Restore from backup**:
   ```bash
   psql $DATABASE_URL < backups/backup_file.sql
   ```
3. **Verify data integrity**
4. **Restart application**

## Notes

- Migration is **idempotent** - safe to run multiple times
- Uses `IF NOT EXISTS` and `DO $$` blocks for safety
- All operations are transactional
- Verification step prevents data loss
- Backup is created **before** any changes are made
