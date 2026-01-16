-- =====================================================
-- HTCMS - Field Visit & Follow-up System Schema Migration
-- =====================================================
-- This script adds the Field Visit, Follow-up, and Task system to Supabase
-- Run this in Supabase SQL Editor or via psql
-- =====================================================

-- Step 1: Update audit_logs enums to include new entity types and action types
DO $$ 
BEGIN
    -- Add new entity types if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FieldVisit' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
    ) THEN
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'FieldVisit';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FollowUp' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
    ) THEN
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'FollowUp';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CollectorTask' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
    ) THEN
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'CollectorTask';
    END IF;

    -- Add new action types if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FIELD_VISIT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'FIELD_VISIT';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FOLLOW_UP' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'FOLLOW_UP';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TASK_GENERATED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'TASK_GENERATED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TASK_COMPLETED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'TASK_COMPLETED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'NOTICE_TRIGGERED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'NOTICE_TRIGGERED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ENFORCEMENT_ELIGIBLE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'ENFORCEMENT_ELIGIBLE';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'Enum types do not exist yet. They will be created with the tables.';
END $$;

-- Step 2: Create field_visits table
CREATE TABLE IF NOT EXISTS field_visits (
    id SERIAL PRIMARY KEY,
    "visitNumber" VARCHAR(50) NOT NULL UNIQUE,
    "collectorId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "demandId" INTEGER NOT NULL,
    "visitDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitType" VARCHAR(20) NOT NULL CHECK ("visitType" IN ('reminder', 'payment_collection', 'warning', 'final_warning')),
    "citizenResponse" VARCHAR(20) NOT NULL CHECK ("citizenResponse" IN ('will_pay_today', 'will_pay_later', 'refused_to_pay', 'not_available')),
    "expectedPaymentDate" TIMESTAMP WITH TIME ZONE NULL,
    "remarks" TEXT NOT NULL,
    "visitSequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "visitLatitude" DECIMAL(10, 8) NULL,
    "visitLongitude" DECIMAL(11, 8) NULL,
    "visitAddress" TEXT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "deviceType" VARCHAR(20) NOT NULL DEFAULT 'mobile' CHECK ("deviceType" IN ('mobile', 'desktop', 'tablet')),
    "browserName" VARCHAR(100) NULL,
    "operatingSystem" VARCHAR(100) NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'mobile' CHECK ("source" IN ('web', 'mobile')),
    "proofPhotoUrl" VARCHAR(500) NULL,
    "proofNote" TEXT NULL,
    "attendanceId" INTEGER NULL,
    "isWithinAttendanceWindow" BOOLEAN NOT NULL DEFAULT true,
    "attendanceWindowNote" TEXT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'recorded' CHECK ("status" IN ('recorded', 'verified', 'flagged')),
    "flaggedReason" TEXT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_field_visit_collector FOREIGN KEY ("collectorId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_field_visit_property FOREIGN KEY ("propertyId") REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_field_visit_owner FOREIGN KEY ("ownerId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_field_visit_demand FOREIGN KEY ("demandId") REFERENCES demands(id) ON DELETE CASCADE,
    CONSTRAINT fk_field_visit_attendance FOREIGN KEY ("attendanceId") REFERENCES collector_attendance(id) ON DELETE SET NULL
);

-- Step 3: Create follow_ups table
CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    "demandId" INTEGER NOT NULL UNIQUE,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitDate" TIMESTAMP WITH TIME ZONE NULL,
    "lastVisitId" INTEGER NULL,
    "lastVisitType" VARCHAR(20) NULL CHECK ("lastVisitType" IN ('reminder', 'payment_collection', 'warning', 'final_warning')),
    "lastCitizenResponse" VARCHAR(20) NULL CHECK ("lastCitizenResponse" IN ('will_pay_today', 'will_pay_later', 'refused_to_pay', 'not_available')),
    "expectedPaymentDate" TIMESTAMP WITH TIME ZONE NULL,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalationStatus" VARCHAR(20) NOT NULL DEFAULT 'none' CHECK ("escalationStatus" IN ('none', 'first_reminder', 'second_reminder', 'final_warning', 'enforcement_eligible')),
    "isEnforcementEligible" BOOLEAN NOT NULL DEFAULT false,
    "enforcementEligibleDate" TIMESTAMP WITH TIME ZONE NULL,
    "noticeTriggered" BOOLEAN NOT NULL DEFAULT false,
    "noticeId" INTEGER NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedDate" TIMESTAMP WITH TIME ZONE NULL,
    "resolvedBy" INTEGER NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high', 'critical')),
    "nextFollowUpDate" TIMESTAMP WITH TIME ZONE NULL,
    "lastUpdatedBy" INTEGER NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_follow_up_demand FOREIGN KEY ("demandId") REFERENCES demands(id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_up_property FOREIGN KEY ("propertyId") REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_up_owner FOREIGN KEY ("ownerId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_up_last_visit FOREIGN KEY ("lastVisitId") REFERENCES field_visits(id) ON DELETE SET NULL,
    CONSTRAINT fk_follow_up_notice FOREIGN KEY ("noticeId") REFERENCES notices(id) ON DELETE SET NULL,
    CONSTRAINT fk_follow_up_resolver FOREIGN KEY ("resolvedBy") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_follow_up_last_updater FOREIGN KEY ("lastUpdatedBy") REFERENCES users(id) ON DELETE SET NULL
);

-- Step 4: Create collector_tasks table
CREATE TABLE IF NOT EXISTS collector_tasks (
    id SERIAL PRIMARY KEY,
    "taskNumber" VARCHAR(50) NOT NULL UNIQUE,
    "collectorId" INTEGER NOT NULL,
    "demandId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "followUpId" INTEGER NULL,
    "taskDate" DATE NOT NULL,
    "taskType" VARCHAR(20) NOT NULL CHECK ("taskType" IN ('overdue_followup', 'promised_payment', 'escalation_visit', 'enforcement_visit')),
    "priority" VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high', 'critical')),
    "actionRequired" TEXT NOT NULL,
    "citizenName" VARCHAR(200) NOT NULL,
    "propertyNumber" VARCHAR(50) NOT NULL,
    "wardNumber" VARCHAR(20) NULL,
    "dueAmount" DECIMAL(12, 2) NOT NULL,
    "overdueDays" INTEGER NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitDate" TIMESTAMP WITH TIME ZONE NULL,
    "lastVisitStatus" VARCHAR(100) NULL,
    "expectedPaymentDate" TIMESTAMP WITH TIME ZONE NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'in_progress', 'completed', 'cancelled', 'expired')),
    "completedAt" TIMESTAMP WITH TIME ZONE NULL,
    "completedBy" INTEGER NULL,
    "completionNote" TEXT NULL,
    "relatedVisitId" INTEGER NULL,
    "generatedBy" VARCHAR(20) NOT NULL DEFAULT 'system' CHECK ("generatedBy" IN ('system', 'admin')),
    "generationReason" TEXT NULL,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_collector_task_collector FOREIGN KEY ("collectorId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_collector_task_demand FOREIGN KEY ("demandId") REFERENCES demands(id) ON DELETE CASCADE,
    CONSTRAINT fk_collector_task_property FOREIGN KEY ("propertyId") REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_collector_task_owner FOREIGN KEY ("ownerId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_collector_task_follow_up FOREIGN KEY ("followUpId") REFERENCES follow_ups(id) ON DELETE SET NULL,
    CONSTRAINT fk_collector_task_completer FOREIGN KEY ("completedBy") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_collector_task_related_visit FOREIGN KEY ("relatedVisitId") REFERENCES field_visits(id) ON DELETE SET NULL
);

-- Step 5: Update notices table to add collector-triggered fields
DO $$ 
BEGIN
    -- Add isCollectorTriggered column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notices' AND column_name = 'isCollectorTriggered'
    ) THEN
        ALTER TABLE notices ADD COLUMN "isCollectorTriggered" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add triggeredByVisitCount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notices' AND column_name = 'triggeredByVisitCount'
    ) THEN
        ALTER TABLE notices ADD COLUMN "triggeredByVisitCount" INTEGER NULL;
    END IF;

    -- Add followUpId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notices' AND column_name = 'followUpId'
    ) THEN
        ALTER TABLE notices ADD COLUMN "followUpId" INTEGER NULL;
        ALTER TABLE notices ADD CONSTRAINT fk_notice_follow_up FOREIGN KEY ("followUpId") REFERENCES follow_ups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 6: Create indexes for field_visits
CREATE INDEX IF NOT EXISTS idx_field_visits_collector_id ON field_visits("collectorId");
CREATE INDEX IF NOT EXISTS idx_field_visits_property_id ON field_visits("propertyId");
CREATE INDEX IF NOT EXISTS idx_field_visits_demand_id ON field_visits("demandId");
CREATE INDEX IF NOT EXISTS idx_field_visits_visit_date ON field_visits("visitDate");
CREATE INDEX IF NOT EXISTS idx_field_visits_collector_date ON field_visits("collectorId", "visitDate");
CREATE INDEX IF NOT EXISTS idx_field_visits_demand_sequence ON field_visits("demandId", "visitSequenceNumber");
CREATE INDEX IF NOT EXISTS idx_field_visits_attendance_id ON field_visits("attendanceId");

-- Step 7: Create indexes for follow_ups
CREATE INDEX IF NOT EXISTS idx_follow_ups_property_id ON follow_ups("propertyId");
CREATE INDEX IF NOT EXISTS idx_follow_ups_owner_id ON follow_ups("ownerId");
CREATE INDEX IF NOT EXISTS idx_follow_ups_escalation_status ON follow_ups("escalationStatus");
CREATE INDEX IF NOT EXISTS idx_follow_ups_enforcement_eligible ON follow_ups("isEnforcementEligible");
CREATE INDEX IF NOT EXISTS idx_follow_ups_priority ON follow_ups("priority");
CREATE INDEX IF NOT EXISTS idx_follow_ups_next_follow_up_date ON follow_ups("nextFollowUpDate");
CREATE INDEX IF NOT EXISTS idx_follow_ups_is_resolved ON follow_ups("isResolved");

-- Step 8: Create indexes for collector_tasks
CREATE INDEX IF NOT EXISTS idx_collector_tasks_collector_date ON collector_tasks("collectorId", "taskDate");
CREATE INDEX IF NOT EXISTS idx_collector_tasks_demand_id ON collector_tasks("demandId");
CREATE INDEX IF NOT EXISTS idx_collector_tasks_status ON collector_tasks("status");
CREATE INDEX IF NOT EXISTS idx_collector_tasks_priority ON collector_tasks("priority");
CREATE INDEX IF NOT EXISTS idx_collector_tasks_task_type ON collector_tasks("taskType");
CREATE INDEX IF NOT EXISTS idx_collector_tasks_date_status ON collector_tasks("taskDate", "status");

-- Step 9: Add comments
COMMENT ON TABLE field_visits IS 'Field visits made by collectors. Append-only, immutable records.';
COMMENT ON TABLE follow_ups IS 'Follow-up tracking per demand. Tracks visit counts and escalation status.';
COMMENT ON TABLE collector_tasks IS 'Auto-generated daily tasks for collectors. System-generated based on overdue demands and follow-up status.';

-- =====================================================
-- Migration Complete!
-- =====================================================
-- The following tables have been created:
-- - field_visits: Records of all field visits
-- - follow_ups: Tracks visit counts and escalation per demand
-- - collector_tasks: Auto-generated daily tasks
-- 
-- The notices table has been updated to support collector-triggered notices.
-- All indexes and foreign keys have been created.
-- =====================================================
