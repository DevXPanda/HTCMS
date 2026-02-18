-- Add geo location fields to worker_tasks for before and after photos
-- Run with: node run-migration.js

ALTER TABLE worker_tasks
ADD COLUMN IF NOT EXISTS before_photo_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS before_photo_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS after_photo_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS after_photo_longitude DECIMAL(11, 8);

COMMENT ON COLUMN worker_tasks.before_photo_latitude IS 'Latitude of location where before photo was taken';
COMMENT ON COLUMN worker_tasks.before_photo_longitude IS 'Longitude of location where before photo was taken';
COMMENT ON COLUMN worker_tasks.after_photo_latitude IS 'Latitude of location where after photo was taken';
COMMENT ON COLUMN worker_tasks.after_photo_longitude IS 'Longitude of location where after photo was taken';
