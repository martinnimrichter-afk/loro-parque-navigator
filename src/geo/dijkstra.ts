import type { Graph } from '../types';

export function shortestPath(
  graph: Graph, from: number, to: number
): { distM: number; nodeIds: number[] } | null {
  const adjacency = new Map<number, [number, number][]>();
  for (const [a, b, d] of graph.edges) {
    (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push([b, d]);
    (adjacency.get(b) ?? adjacency.set(b, []).get(b)!).push([a, d]);
  }

  const dist = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, number>();
  const visited = new Set<number>();

  for (;;) {
    let current = -1;
    let best = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < best) { best = d; current = node; }
    }
    if (current === -1) return null;
    if (current === to) break;
    visited.add(current);
    for (const [next, weight] of adjacency.get(current) ?? []) {
      const candidate = best + weight;
      if (candidate < (dist.get(next) ?? Infinity)) {
        dist.set(next, candidate);
        prev.set(next, current);
      }
    }
  }

  const nodeIds = [to];
  let head = to;
  while (head !== from) {
    head = prev.get(head)!;
    nodeIds.unshift(head);
  }
  return { distM: dist.get(to)!, nodeIds };
}
