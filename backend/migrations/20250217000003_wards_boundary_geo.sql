-- Optional ward boundary for geo-fence (array of [lat, lng] or GeoJSON polygon)
-- Stored as JSON text: [[lat1,lng1],[lat2,lng2],...] (closed polygon: first point = last point)
ALTER TABLE wards
  ADD COLUMN IF NOT EXISTS boundary_coordinates TEXT NULL;

COMMENT ON COLUMN wards.boundary_coordinates IS 'JSON array of [lat,lng] forming closed polygon for geo-fence';
