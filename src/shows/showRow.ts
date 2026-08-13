import { assess, hhmmToMinutes, nextTime, type ShowStatus } from './canimakeit';
import { route } from '../geo/route';
import type { Graph, ShowEntry, Venue } from '../types';

/** 'unreachable' is not a canimakeit assessment — it means route() found no
 * path at all, so no walk-time promise can be made. Never collapse this into
 * 'easy'/'rush'/'missed'. */
export type RowStatus = ShowStatus | 'unreachable';

export interface ShowRow {
  venue: Venue;
  next: string;
  /** null when the venue is unreachable from the current origin — render no walk chip. */
  walkMin: number | null;
  status: RowStatus;
}

/**
 * Computes the display row for one show entry, or null if it should be
 * skipped (unknown venue, or no upcoming showtime today).
 *
 * When `route()` returns null (venue unreachable on the current graph), this
 * deliberately returns a row with `walkMin: null` and `status: 'unreachable'`
 * rather than defaulting walk time to 0 minutes — a 0-minute walk would make
 * `assess()` report a false "you'll make it".
 */
export function computeShowRow(
  entry: ShowEntry,
  venue: Venue | undefined,
  graph: Graph,
  origin: { lat: number; lon: number },
  nowMin: number
): ShowRow | null {
  if (!venue) return null;
  const next = nextTime(entry.times, nowMin);
  if (!next) return null;
  const r = route(graph, origin, venue);
  if (!r) return { venue, next, walkMin: null, status: 'unreachable' };
  const walkMin = Math.ceil(r.minutes);
  const status = assess(hhmmToMinutes(next), nowMin, walkMin);
  return { venue, next, walkMin, status };
}
