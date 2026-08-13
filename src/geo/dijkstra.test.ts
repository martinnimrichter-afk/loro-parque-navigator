import { describe, expect, test } from 'vitest';
import { shortestPath } from './dijkstra';
import type { Graph } from '../types';

// square with a diagonal shortcut: 0-1-2 along edges (20m), 0-2 direct (25m)
const graph: Graph = {
  nodes: [
    { id: 0, lat: 0, lon: 0 }, { id: 1, lat: 0, lon: 1 },
    { id: 2, lat: 1, lon: 1 }, { id: 3, lat: 9, lon: 9 }
  ],
  edges: [[0, 1, 10], [1, 2, 10], [0, 2, 25]]
};

describe('shortestPath', () => {
  test('picks the cheaper multi-hop route over the expensive direct edge', () => {
    const r = shortestPath(graph, 0, 2);
    expect(r?.distM).toBe(20);
    expect(r?.nodeIds).toEqual([0, 1, 2]);
  });
  test('works in reverse direction (undirected edges)', () => {
    expect(shortestPath(graph, 2, 0)?.nodeIds).toEqual([2, 1, 0]);
  });
  test('returns null for unreachable node', () => {
    expect(shortestPath(graph, 0, 3)).toBeNull();
  });
  test('from == to gives zero-length path', () => {
    expect(shortestPath(graph, 1, 1)).toEqual({ distM: 0, nodeIds: [1] });
  });
});
