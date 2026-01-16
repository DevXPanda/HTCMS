-- =====================================================
-- HTCMS - Fix Audit Log ENUMs
-- =====================================================
-- This script ensures all audit log enum values are present
-- Run this AFTER creating audit_logs table
-- =====================================================

-- Fix entityType enum
DO $$ 
BEGIN
    -- Add 'Attendance' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Attendance' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
    ) THEN
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'Attendance';
        RAISE NOTICE 'Added Attendance to enum_audit_logs_entity_type';
    END IF;

    -- Add 'FieldVisit' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FieldVisit' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
    ) THEN
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'FieldVisit';
        RAISE NOTICE 'Added FieldVisit to enum_audit_logs_entity_type';
    END IF;

    -- Add 'FollowUp' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FollowUp' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
    ) THEN
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'FollowUp';
        RAISE NOTICE 'Added FollowUp to enum_audit_logs_entity_type';
    END IF;

    -- Add 'CollectorTask' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'CollectorTask' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
    ) THEN
        ALTER TYPE enum_audit_logs_entity_type ADD VALUE 'CollectorTask';
        RAISE NOTICE 'Added CollectorTask to enum_audit_logs_entity_type';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'enum_audit_logs_entity_type does not exist. Run table creation first.';
END $$;

-- Fix actionType enum
DO $$ 
BEGIN
    -- Add 'FIELD_VISIT' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FIELD_VISIT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'FIELD_VISIT';
        RAISE NOTICE 'Added FIELD_VISIT to enum_audit_logs_action_type';
    END IF;

    -- Add 'FOLLOW_UP' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FOLLOW_UP' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'FOLLOW_UP';
        RAISE NOTICE 'Added FOLLOW_UP to enum_audit_logs_action_type';
    END IF;

    -- Add 'TASK_GENERATED' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TASK_GENERATED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'TASK_GENERATED';
        RAISE NOTICE 'Added TASK_GENERATED to enum_audit_logs_action_type';
    END IF;

    -- Add 'TASK_COMPLETED' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TASK_COMPLETED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'TASK_COMPLETED';
        RAISE NOTICE 'Added TASK_COMPLETED to enum_audit_logs_action_type';
    END IF;

    -- Add 'NOTICE_TRIGGERED' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'NOTICE_TRIGGERED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'NOTICE_TRIGGERED';
        RAISE NOTICE 'Added NOTICE_TRIGGERED to enum_audit_logs_action_type';
    END IF;

    -- Add 'ENFORCEMENT_ELIGIBLE' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ENFORCEMENT_ELIGIBLE' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'ENFORCEMENT_ELIGIBLE';
        RAISE NOTICE 'Added ENFORCEMENT_ELIGIBLE to enum_audit_logs_action_type';
    END IF;

    -- Add 'VIEW' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'VIEW' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
    ) THEN
        ALTER TYPE enum_audit_logs_action_type ADD VALUE 'VIEW';
        RAISE NOTICE 'Added VIEW to enum_audit_logs_action_type';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        RAISE NOTICE 'enum_audit_logs_action_type does not exist. Run table creation first.';
END $$;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run these to verify enums were updated:
-- 
-- SELECT enumlabel FROM pg_enum 
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_entity_type')
-- ORDER BY enumsortorder;
-- 
-- SELECT enumlabel FROM pg_enum 
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_audit_logs_action_type')
-- ORDER BY enumsortorder;
-- =====================================================
