-- Worker Payroll: store monthly payroll summary with EO verification and Admin approval
-- Run with: node run-migration.js (or psql $DATABASE_URL -f this file)

-- Optional: daily rate per worker for payable_amount calculation (default 0 if null)
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(12, 2) NULL;

COMMENT ON COLUMN workers.daily_rate IS 'Daily wage for payroll; NULL uses system default or 0';

-- Worker payroll table: one row per worker per month
CREATE TABLE IF NOT EXISTS worker_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year INTEGER NOT NULL,
  present_days INTEGER NOT NULL DEFAULT 0,
  payable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  daily_rate_used DECIMAL(12, 2) NULL,
  eo_verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (eo_verification_status IN ('pending', 'verified', 'rejected')),
  eo_verified_at TIMESTAMP WITH TIME ZONE NULL,
  eo_verified_by INTEGER NULL REFERENCES admin_management(id) ON DELETE SET NULL,
  admin_approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (admin_approval_status IN ('pending', 'approved', 'rejected')),
  admin_approved_at TIMESTAMP WITH TIME ZONE NULL,
  admin_approved_by INTEGER NULL REFERENCES admin_management(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_worker_payroll_worker_id ON worker_payroll(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payroll_period ON worker_payroll(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_worker_payroll_eo_status ON worker_payroll(eo_verification_status);
CREATE INDEX IF NOT EXISTS idx_worker_payroll_admin_status ON worker_payroll(admin_approval_status);
