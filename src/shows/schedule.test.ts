import { describe, expect, test } from 'vitest';
import { loadShows, validateShows } from './schedule';

const good = {
  updated: '2026-08-13', timezone: 'Atlantic/Canary',
  venues: [{ id: 'v1', name: { en: 'V1' }, lat: 1, lon: 2 }],
  shows: [{ venueId: 'v1', times: ['10:00'] }]
};

describe('validateShows', () => {
  test('accepts valid data', () => {
    expect(validateShows(good).venues).toHaveLength(1);
  });
  test('rejects unknown venueId and malformed times', () => {
    expect(() => validateShows({ ...good, shows: [{ venueId: 'ghost', times: ['10:00'] }] })).toThrow(/unknown venueId/);
    expect(() => validateShows({ ...good, shows: [{ venueId: 'v1', times: ['10am'] }] })).toThrow(/bad times/);
  });
});

describe('loadShows', () => {
  test('uses network data when fetch succeeds', async () => {
    const fetchFn = (async () => new Response(JSON.stringify(good))) as typeof fetch;
    const r = await loadShows('x', fetchFn);
    expect(r.source).toBe('network');
    expect(r.data.venues[0]?.id).toBe('v1');
  });
  test('falls back to bundled data when fetch fails or payload is invalid', async () => {
    const failing = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect((await loadShows('x', failing)).source).toBe('fallback');
    const badPayload = (async () => new Response('{}')) as typeof fetch;
    expect((await loadShows('x', badPayload)).source).toBe('fallback');
  });
});
