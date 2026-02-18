/**
 * Point-in-polygon (ray casting). Polygon is array of [lat, lng] or [lng, lat].
 * Uses lat as y, lng as x. Assumes closed polygon (first point need not equal last).
 */
export function isPointInPolygon(lat, lng, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return true;
  const x = lng;
  const y = lat;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][1];
    const yi = polygon[i][0];
    const xj = polygon[j][1];
    const yj = polygon[j][0];
    if (yj === yi) continue;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Parse boundary_coordinates from DB (JSON string or array).
 * Expects [[lat,lng],...] or [[lng,lat],...]. GeoJSON is [lng,lat]; we accept [lat,lng] as stored.
 */
export function parseWardBoundary(boundaryCoordinates) {
  if (!boundaryCoordinates) return null;
  try {
    const parsed = typeof boundaryCoordinates === 'string' ? JSON.parse(boundaryCoordinates) : boundaryCoordinates;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
