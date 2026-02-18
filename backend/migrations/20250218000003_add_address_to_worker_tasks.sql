-- Add address fields to worker_tasks for before and after photos
-- Run with: node run-migration.js

ALTER TABLE worker_tasks
ADD COLUMN IF NOT EXISTS before_photo_address TEXT,
ADD COLUMN IF NOT EXISTS after_photo_address TEXT;

COMMENT ON COLUMN worker_tasks.before_photo_address IS 'Human-readable address where before photo was taken';
COMMENT ON COLUMN worker_tasks.after_photo_address IS 'Human-readable address where after photo was taken';
