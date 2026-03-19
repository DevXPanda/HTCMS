import { sequelize } from '../config/database.js';
import { PaymentApprovalRequest } from '../models/PaymentApprovalRequest.js';

export const ensureRoleEnums = async () => {
  // Keep enum values aligned with AdminManagement model in existing databases.
  await sequelize.query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TYPE enum_admin_management_role ADD VALUE IF NOT EXISTS 'ACCOUNT_OFFICER';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
    END
    $$;
  `);

  // Some databases also have an old table CHECK constraint that blocks new enum values.
  // Rebuild it against enum_range so future enum additions do not break inserts.
  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'admin_management_role_check'
      ) THEN
        ALTER TABLE admin_management DROP CONSTRAINT admin_management_role_check;
      END IF;

      ALTER TABLE admin_management
      ADD CONSTRAINT admin_management_role_check
      CHECK (role = ANY (enum_range(NULL::enum_admin_management_role)));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  // Extend audit_logs enums so new entity types and roles don't break inserts.
  await sequelize.query(`
    DO $$
    BEGIN
      BEGIN ALTER TYPE audit_entity_type ADD VALUE IF NOT EXISTS 'PaymentApprovalRequest'; EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN ALTER TYPE "enum_audit_logs_entityType" ADD VALUE IF NOT EXISTS 'PaymentApprovalRequest'; EXCEPTION WHEN duplicate_object THEN NULL; WHEN invalid_parameter_value THEN NULL; END;
      BEGIN ALTER TYPE audit_actor_role ADD VALUE IF NOT EXISTS 'account_officer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
      BEGIN ALTER TYPE "enum_audit_logs_actorRole" ADD VALUE IF NOT EXISTS 'account_officer'; EXCEPTION WHEN duplicate_object THEN NULL; WHEN invalid_parameter_value THEN NULL; END;
    END
    $$;
  `);

  // collector_tasks taskType check constraint may be missing 'due_today' in older databases.
  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'collector_tasks_taskType_check'
      ) THEN
        ALTER TABLE collector_tasks DROP CONSTRAINT "collector_tasks_taskType_check";
      END IF;

      ALTER TABLE collector_tasks
      ADD CONSTRAINT "collector_tasks_taskType_check"
      CHECK ("taskType"::text = ANY (ARRAY[
        'overdue_followup','promised_payment','escalation_visit','enforcement_visit','due_today'
      ]::text[]));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  // Ensure newly introduced workflow table exists in DBs that were created before this feature.
  await PaymentApprovalRequest.sync();
};
