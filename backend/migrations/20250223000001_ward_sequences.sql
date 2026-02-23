-- Ward sequences for transaction-safe unique ID generation
-- Format: [PREFIX][TYPE_CODE?][WARD_3_DIGIT][SERIAL_4_DIGIT] e.g. PC0010001, WT0010001, ST0020003

CREATE TABLE IF NOT EXISTS ward_sequences (
  id SERIAL PRIMARY KEY,
  module_key VARCHAR(30) NOT NULL,
  ward_id INTEGER NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(module_key, ward_id)
);

CREATE INDEX IF NOT EXISTS idx_ward_sequences_ward_id ON ward_sequences(ward_id);

-- Remove duplicates: keep one row per (module_key, ward_id) with max last_sequence so unique index can be created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ward_sequences') THEN
    DELETE FROM ward_sequences a
    USING ward_sequences b
    WHERE a.module_key = b.module_key AND a.ward_id = b.ward_id
      AND (a.last_sequence < b.last_sequence OR (a.last_sequence = b.last_sequence AND a.id < b.id));
  END IF;
END $$;

-- Ensure ON CONFLICT (module_key, ward_id) can be used (required if table was created by Sequelize or without unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ward_sequences_module_ward_unique ON ward_sequences(module_key, ward_id);

COMMENT ON TABLE ward_sequences IS 'Ward-wise sequences for unique ID generation (Property, Water, Shop, D2DC)';
