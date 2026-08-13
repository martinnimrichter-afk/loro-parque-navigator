import { haversineM } from './geo.mjs';

const WALKABLE = new Set(['footway', 'path', 'pedestrian', 'steps', 'track', 'service', 'residential', 'living_street']);

export function buildGraph(features) {
  const nodeIdByKey = new Map();
  const nodes = [];
  const edges = [];

  const nodeIdFor = (lon, lat) => {
    const key = `${lon.toFixed(6)},${lat.toFixed(6)}`;
    const existing = nodeIdByKey.get(key);
    if (existing !== undefined) return existing;
    const id = nodes.length;
    nodeIdByKey.set(key, id);
    nodes.push({ id, lat, lon });
    return id;
  };

  for (const f of features) {
    if (f.geometry?.type !== 'LineString') continue;
    if (!WALKABLE.has(f.properties?.highway)) continue;
    const coords = f.geometry.coordinates;
    for (let i = 1; i < coords.length; i++) {
      const [lon1, lat1] = coords[i - 1];
      const [lon2, lat2] = coords[i];
      const a = nodeIdFor(lon1, lat1);
      const b = nodeIdFor(lon2, lat2);
      if (a === b) continue;
      edges.push([a, b, haversineM(lat1, lon1, lat2, lon2)]);
    }
  }
  return { nodes, edges };
}
