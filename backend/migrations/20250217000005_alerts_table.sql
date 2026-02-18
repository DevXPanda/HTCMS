-- Alerts table for field worker monitoring (cron-generated + optional SMS)
-- Run with: node run-migration.js

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  entity_type VARCHAR(30) NOT NULL,
  entity_id VARCHAR(100) NULL,
  eo_id INTEGER NULL REFERENCES admin_management(id) ON DELETE SET NULL,
  ward_id INTEGER NULL REFERENCES wards(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NULL,
  sms_sent BOOLEAN NOT NULL DEFAULT FALSE,
  sms_sent_at TIMESTAMP WITH TIME ZONE NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE NULL,
  acknowledged_by INTEGER NULL REFERENCES admin_management(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_eo_id ON alerts(eo_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unack ON alerts(acknowledged) WHERE acknowledged = FALSE;

COMMENT ON COLUMN alerts.alert_type IS 'worker_not_present_by_9am | supervisor_inactive | geo_violations_threshold | three_consecutive_absences';
COMMENT ON COLUMN alerts.metadata IS 'Extra data: threshold, count, absent_dates, etc.';
COMMENT ON COLUMN alerts.sms_sent IS 'Placeholder: set true when SMS integration sends notification';
