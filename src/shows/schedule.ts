import type { ShowEntry, ShowsData } from '../types';
import fallback from './fallback.json';

export function validateShows(data: unknown): ShowsData {
  const d = data as ShowsData;
  if (!d || typeof d.updated !== 'string' || !Array.isArray(d.venues) || !Array.isArray(d.shows)) {
    throw new Error('shows.json: missing updated/venues/shows');
  }
  for (const v of d.venues) {
    if (!v.id || !v.name?.en || typeof v.lat !== 'number' || typeof v.lon !== 'number') {
      throw new Error(`shows.json: bad venue ${JSON.stringify(v)}`);
    }
  }
  const venueIds = new Set(d.venues.map((v) => v.id));
  for (const s of d.shows) {
    if (!venueIds.has(s.venueId)) throw new Error(`shows.json: unknown venueId ${s.venueId}`);
    if (!Array.isArray(s.times) || s.times.some((t) => !/^\d{2}:\d{2}$/.test(t))) {
      throw new Error(`shows.json: bad times for ${s.venueId}`);
    }
  }
  return d;
}

export async function loadShows(
  url: string,
  fetchFn: typeof fetch = fetch
): Promise<{ data: ShowsData; source: 'network' | 'fallback' }> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: validateShows(await res.json()), source: 'network' };
  } catch {
    return { data: validateShows(fallback), source: 'fallback' };
  }
}

export function activeEntries(data: ShowsData, isoDate: string): ShowEntry[] {
  return data.shows.filter((s) =>
    (!s.validFrom || s.validFrom <= isoDate) && (!s.validTo || isoDate <= s.validTo)
  );
}
