-- Update workers.worker_type check constraint to allow all worker types.
-- Run via: npm run migrate:worker-type

ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_worker_type_check;

ALTER TABLE workers ADD CONSTRAINT workers_worker_type_check CHECK (
  worker_type IN (
    'ULB',
    'CONTRACTUAL',
    'SWEEPING',
    'TOILET',
    'MRF',
    'CLEANING',
    'DRAINAGE',
    'SOLID_WASTE',
    'ROAD_MAINTENANCE',
    'OTHER'
  )
);
