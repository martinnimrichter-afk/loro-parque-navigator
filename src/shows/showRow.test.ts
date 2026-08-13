import { describe, expect, test } from 'vitest';
import { computeShowRow } from './showRow';
import type { Graph, ShowEntry, Venue } from '../types';

const graph: Graph = {
  nodes: [
    { id: 0, lat: 28.4082, lon: -16.5659 },
    { id: 1, lat: 28.4082, lon: -16.5649 }
  ],
  edges: [[0, 1, 98]]
};

const venue: Venue = { id: 'v1', name: { en: 'V1' }, lat: 28.4082, lon: -16.5649 };
const origin = { lat: 28.4082, lon: -16.5659 };

describe('computeShowRow', () => {
  test('returns null when the venue is unknown', () => {
    const entry: ShowEntry = { venueId: 'ghost', times: ['12:00'] };
    expect(computeShowRow(entry, undefined, graph, origin, 600)).toBeNull();
  });

  test('returns null when there is no upcoming showtime today', () => {
    const entry: ShowEntry = { venueId: 'v1', times: ['08:00'] };
    expect(computeShowRow(entry, venue, graph, origin, 600)).toBeNull();
  });

  test('returns a row with an assessed status when the venue is reachable', () => {
    const entry: ShowEntry = { venueId: 'v1', times: ['12:00'] };
    const row = computeShowRow(entry, venue, graph, origin, 600);
    expect(row).not.toBeNull();
    expect(row!.walkMin).not.toBeNull();
    expect(row!.status).not.toBe('unreachable');
  });

  test('never fabricates a walk time or an easy/rush/missed verdict when route() returns null', () => {
    const emptyGraph: Graph = { nodes: [], edges: [] };
    const entry: ShowEntry = { venueId: 'v1', times: ['12:00'] };
    const row = computeShowRow(entry, venue, emptyGraph, origin, 600);
    expect(row).not.toBeNull();
    expect(row!.walkMin).toBeNull();
    expect(row!.status).toBe('unreachable');
  });
});
