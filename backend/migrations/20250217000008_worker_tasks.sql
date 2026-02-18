-- Worker Tasks: Task assignment and work proof tracking for field workers
-- Run with: node run-migration.js

-- Worker Tasks table
CREATE TABLE IF NOT EXISTS worker_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  supervisor_id INTEGER NOT NULL REFERENCES admin_management(id) ON DELETE RESTRICT,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE RESTRICT,
  ulb_id UUID NOT NULL REFERENCES ulbs(id) ON DELETE RESTRICT,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('SWEEPING', 'TOILET', 'MRF', 'OTHER')),
  area_street VARCHAR(255) NOT NULL,
  shift VARCHAR(20) NOT NULL CHECK (shift IN ('MORNING', 'EVENING')),
  special_instructions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  before_photo_url VARCHAR(500),
  after_photo_url VARCHAR(500),
  work_proof_remarks TEXT,
  escalation_flag BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_tasks_worker_id ON worker_tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_supervisor_id ON worker_tasks(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_ward_id ON worker_tasks(ward_id);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_ulb_id ON worker_tasks(ulb_id);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_status ON worker_tasks(status);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_assigned_date ON worker_tasks(assigned_date);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_worker_date ON worker_tasks(worker_id, assigned_date);

COMMENT ON TABLE worker_tasks IS 'Task assignments for field workers with work proof tracking';
COMMENT ON COLUMN worker_tasks.escalation_flag IS 'Flag to indicate if work was not completed and needs escalation';
