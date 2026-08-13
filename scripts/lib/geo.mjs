const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

export function haversineM(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Returns [lon, lat] representative point for Point/LineString/Polygon geometry. */
export function centroidOf(geometry) {
  if (geometry.type === 'Point') return geometry.coordinates;
  const ring = geometry.type === 'Polygon'
    ? geometry.coordinates[0].slice(0, -1)
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates[0][0].slice(0, -1)
      : geometry.coordinates;
  const [sx, sy] = ring.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / ring.length, sy / ring.length];
}
