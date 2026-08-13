import { describe, expect, test } from 'vitest';
import { nearestNodeId, route, walkMinutes } from './route';
import type { Graph } from '../types';

const graph: Graph = {
  nodes: [
    { id: 0, lat: 28.4082, lon: -16.5659 },
    { id: 1, lat: 28.4082, lon: -16.5649 },
    { id: 2, lat: 28.4090, lon: -16.5649 }
  ],
  edges: [[0, 1, 98], [1, 2, 89]]
};

describe('nearestNodeId', () => {
  test('snaps to the closest node', () => {
    expect(nearestNodeId(graph, 28.4081, -16.5660)).toBe(0);
    expect(nearestNodeId(graph, 28.4091, -16.5650)).toBe(2);
  });
  test('returns null on empty graph', () => {
    expect(nearestNodeId({ nodes: [], edges: [] }, 28, -16)).toBeNull();
  });
});

describe('walkMinutes', () => {
  test('3.5 km/h → 350 m takes 6 minutes', () => {
    expect(walkMinutes(350)).toBeCloseTo(6, 1);
  });
});

describe('route', () => {
  test('routes between coordinates and returns GeoJSON-ready coords', () => {
    const r = route(graph, { lat: 28.4082, lon: -16.5660 }, { lat: 28.4091, lon: -16.5650 });
    expect(r).not.toBeNull();
    expect(r!.distM).toBeCloseTo(187, 0);
    expect(r!.coords[0]).toEqual([-16.5659, 28.4082]);
    expect(r!.coords.at(-1)).toEqual([-16.5649, 28.4090]);
    expect(r!.minutes).toBeGreaterThan(2);
  });
});
