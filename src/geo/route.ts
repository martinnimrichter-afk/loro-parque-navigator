import { WALK_SPEED_KMH } from '../config';
import type { Graph } from '../types';
import { haversineM } from './distance';
import { shortestPath } from './dijkstra';

export function nearestNodeId(graph: Graph, lat: number, lon: number): number | null {
  let bestId: number | null = null;
  let bestDist = Infinity;
  for (const node of graph.nodes) {
    const d = haversineM(lat, lon, node.lat, node.lon);
    if (d < bestDist) { bestDist = d; bestId = node.id; }
  }
  return bestId;
}

export function walkMinutes(distM: number): number {
  return distM / ((WALK_SPEED_KMH * 1000) / 60);
}

export function route(
  graph: Graph,
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): { distM: number; minutes: number; coords: [number, number][] } | null {
  const fromId = nearestNodeId(graph, from.lat, from.lon);
  const toId = nearestNodeId(graph, to.lat, to.lon);
  if (fromId === null || toId === null) return null;
  const path = shortestPath(graph, fromId, toId);
  if (!path) return null;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const coords = path.nodeIds.map((id) => {
    const n = byId.get(id)!;
    return [n.lon, n.lat] as [number, number];
  });
  return { distM: path.distM, minutes: walkMinutes(path.distM), coords };
}
