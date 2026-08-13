import { describe, expect, test } from 'vitest';
import { buildGraph } from './graph.mjs';

const path = (id, coords, highway = 'footway') => ({
  id, properties: { highway }, geometry: { type: 'LineString', coordinates: coords }
});

describe('buildGraph', () => {
  test('one two-point path becomes 2 nodes and 1 edge with real distance', () => {
    const g = buildGraph([path('w1', [[-16.5659, 28.4082], [-16.5649, 28.4082]])]);
    expect(g.nodes).toHaveLength(2);
    expect(g.edges).toHaveLength(1);
    const [, , dist] = g.edges[0];
    expect(dist).toBeGreaterThan(95);
    expect(dist).toBeLessThan(101);
  });

  test('paths sharing an endpoint share one node (junction)', () => {
    const shared = [-16.5649, 28.4082];
    const g = buildGraph([
      path('w1', [[-16.5659, 28.4082], shared]),
      path('w2', [shared, [-16.5649, 28.4092]])
    ]);
    expect(g.nodes).toHaveLength(3);
    expect(g.edges).toHaveLength(2);
  });

  test('non-walkable and non-line features are ignored', () => {
    const g = buildGraph([
      path('w1', [[-16.566, 28.408], [-16.565, 28.408]], 'motorway'),
      { id: 'n1', properties: { amenity: 'toilets' }, geometry: { type: 'Point', coordinates: [-16.566, 28.408] } }
    ]);
    expect(g.nodes).toHaveLength(0);
    expect(g.edges).toHaveLength(0);
  });
});
