# Field Visit & Follow-up System Schema Migration

This migration adds the complete Field Visit, Follow-up, and Task system to your Supabase database.

## What This Migration Does

1. **Creates `field_visits` table** with all required fields:
   - Visit tracking (visit number, type, sequence)
   - Citizen response and expected payment date
   - Location (GPS coordinates, address)
   - Device and network information
   - Proof/evidence fields
   - Attendance window validation
   - Append-only (immutable records)

2. **Creates `follow_ups` table** to track:
   - Visit counts per demand
   - Escalation levels and status
   - Enforcement eligibility
   - Notice triggers
   - Resolution tracking

3. **Creates `collector_tasks` table** for:
   - Auto-generated daily tasks
   - Task priority and status
   - Context information (denormalized for performance)
   - Task completion tracking

4. **Updates `notices` table**:
   - Adds `isCollectorTriggered` field
   - Adds `triggeredByVisitCount` field
   - Adds `followUpId` foreign key

5. **Updates `audit_logs` table**:
   - Adds new entity types: FieldVisit, FollowUp, CollectorTask
   - Adds new action types: FIELD_VISIT, FOLLOW_UP, TASK_GENERATED, TASK_COMPLETED, NOTICE_TRIGGERED, ENFORCEMENT_ELIGIBLE

6. **Creates comprehensive indexes** for optimal query performance

## Prerequisites

- `users` table must exist
- `properties` table must exist
- `demands` table must exist
- `notices` table must exist
- `collector_attendance` table must exist (run attendance migration first)

## How to Run

### Option 1: Using Node Script (Recommended)

```bash
cd backend
npm run migrate-field-visits
```

Make sure your `.env` file has `DATABASE_URL` set to your Supabase connection string.

### Option 2: Using Supabase SQL Editor

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `migrate-field-visits-schema.sql`
4. Paste and run the SQL script

### Option 3: Using psql Command Line

```bash
psql $DATABASE_URL -f backend/scripts/migrate-field-visits-schema.sql
```

## Verification

After running the migration, verify the tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('field_visits', 'follow_ups', 'collector_tasks');

-- Check if notices table was updated
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notices' 
AND column_name IN ('isCollectorTriggered', 'triggeredByVisitCount', 'followUpId');

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('field_visits', 'follow_ups', 'collector_tasks');
```

## System Features

### Field Visit System
- Automatic visit number generation
- Visit sequence validation (prevents skipping levels)
- Attendance window validation
- GPS location capture
- Device fingerprinting
- Append-only records (immutable)

### Follow-up Tracking
- Automatic visit count tracking
- Escalation level management
- Enforcement eligibility detection
- Automatic notice triggering (after 3 visits)
- Priority calculation based on visits and overdue days

### Task Generation
- Auto-generated daily tasks (runs at 6:00 AM via cron)
- Priority-based task assignment
- Context-aware task creation
- Task completion tracking

### Integration Points
- **Attendance**: Visits validated against attendance windows
- **Payments**: Follow-ups auto-resolved on payment
- **Notices**: Automatic enforcement notice triggering
- **Audit Logs**: Comprehensive logging of all actions

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS collector_tasks CASCADE;
DROP TABLE IF EXISTS follow_ups CASCADE;
DROP TABLE IF EXISTS field_visits CASCADE;

-- Remove columns from notices table
ALTER TABLE notices DROP COLUMN IF EXISTS "followUpId";
ALTER TABLE notices DROP COLUMN IF EXISTS "triggeredByVisitCount";
ALTER TABLE notices DROP COLUMN IF EXISTS "isCollectorTriggered";

-- Note: Removing enum values requires recreating the enum type
-- This is complex and not recommended unless absolutely necessary
```

## Important Notes

- ⚠️ **Data Safety**: This migration only creates table structures. No existing data is affected.
- 🔒 **Immutability**: Field visits are append-only and cannot be edited or deleted.
- 📊 **Indexes**: Comprehensive indexes created for optimal performance.
- 🔗 **Foreign Keys**: All tables reference existing tables (users, properties, demands, notices).
- ⏰ **Cron Jobs**: Task generation runs automatically at 6:00 AM daily (configured in server.js).

## Troubleshooting

### Error: "relation users does not exist"
Make sure your `users` table exists before running this migration.

### Error: "relation collector_attendance does not exist"
Run the attendance migration first: `npm run migrate-attendance`

### Error: "permission denied"
Make sure your database user has CREATE TABLE and CREATE INDEX permissions.

### Error: "enum value already exists"
This is safe to ignore - the migration checks for existing enum values before adding them.

## Next Steps

After migration:

1. **Generate initial tasks**: Run `POST /api/tasks/generate` (admin only) or wait for daily cron job
2. **Test field visit creation**: Collectors can now record field visits
3. **Monitor operations**: Use admin field monitoring dashboard to track activities
4. **Configure escalation rules**: (Future enhancement - currently hardcoded to 3 visits)

## Support

If you encounter any issues, check:
1. Your `DATABASE_URL` is correctly set
2. Your database user has necessary permissions
3. All prerequisite tables exist
4. Attendance migration has been run first
