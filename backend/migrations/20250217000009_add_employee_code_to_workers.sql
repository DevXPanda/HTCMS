-- Add employee_code column to workers table
-- Run with: node run-migration.js

-- Add employee_code column if it doesn't exist
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50) NULL;

-- Create unique index on employee_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_employee_code ON workers(employee_code) WHERE employee_code IS NOT NULL;

-- Update existing workers with generated employee codes (if any exist)
-- Uses information_schema to find the actual column name
DO $$
DECLARE
  w RECORD;
  ward_num VARCHAR(20);
  next_num INTEGER;
  emp_code VARCHAR(50);
  col_name TEXT;
BEGIN
  -- Find the actual column name for ward number
  SELECT column_name INTO col_name
  FROM information_schema.columns
  WHERE table_name = 'wards' 
    AND (column_name = 'wardNumber' OR column_name = 'ward_number' OR column_name = 'wardnumber')
  LIMIT 1;
  
  IF col_name IS NULL THEN
    RAISE NOTICE 'Could not find ward number column in wards table';
    RETURN;
  END IF;
  
  FOR w IN SELECT id, ward_id FROM workers WHERE employee_code IS NULL LOOP
    -- Get ward number using dynamic column name
    EXECUTE format('SELECT %I INTO ward_num FROM wards WHERE id = $1', col_name) USING w.ward_id;
    
    IF ward_num IS NOT NULL THEN
      -- Count existing workers in this ward
      SELECT COUNT(*) INTO next_num FROM workers WHERE ward_id = w.ward_id AND employee_code IS NOT NULL;
      next_num := next_num + 1;
      
      -- Generate employee code
      emp_code := 'WRK-' || ward_num || '-' || LPAD(next_num::TEXT, 4, '0');
      
      -- Ensure uniqueness
      WHILE EXISTS (SELECT 1 FROM workers WHERE employee_code = emp_code) LOOP
        next_num := next_num + 1;
        emp_code := 'WRK-' || ward_num || '-' || LPAD(next_num::TEXT, 4, '0');
      END LOOP;
      
      -- Update worker
      UPDATE workers SET employee_code = emp_code WHERE id = w.id;
    END IF;
  END LOOP;
END $$;

-- Make employee_code NOT NULL after updating existing records
ALTER TABLE workers
  ALTER COLUMN employee_code SET NOT NULL;

COMMENT ON COLUMN workers.employee_code IS 'Unique employee code in format WRK-{WARD_CODE}-{NUMBER}';
