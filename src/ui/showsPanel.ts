import { assess, hhmmToMinutes, nextTime, type ShowStatus } from '../shows/canimakeit';
import { activeEntries } from '../shows/schedule';
import { route } from '../geo/route';
import { localName } from '../map/markers';
import type { Graph, Lang, ShowsData, Venue } from '../types';

export interface ShowsPanelDeps {
  container: HTMLElement;
  data: ShowsData;
  graph: Graph;
  origin: () => { lat: number; lon: number };
  now: () => Date;
  t: (key: string) => string;
  lang: Lang;
  onVenueSelect: (venue: Venue) => void;
}

const STATUS_KEY: Record<ShowStatus, string> = {
  easy: 'shows.easy', rush: 'shows.rush', missed: 'shows.missed'
};

export function renderShowsPanel(deps: ShowsPanelDeps): void {
  const { container, data, graph, origin, now, t, lang, onVenueSelect } = deps;
  const current = now();
  const nowMin = current.getHours() * 60 + current.getMinutes();
  const isoDate = current.toISOString().slice(0, 10);
  const venueById = new Map(data.venues.map((v) => [v.id, v]));

  const rows = activeEntries(data, isoDate).flatMap((entry) => {
    const venue = venueById.get(entry.venueId);
    if (!venue) return [];
    const next = nextTime(entry.times, nowMin);
    if (!next) return [];
    const r = route(graph, origin(), venue);
    const walkMin = r ? Math.ceil(r.minutes) : 0;
    const status = assess(hhmmToMinutes(next), nowMin, walkMin);
    return [{ venue, next, walkMin, status }];
  }).sort((a, b) => hhmmToMinutes(a.next) - hhmmToMinutes(b.next));

  container.replaceChildren(
    el('h2', 'shows-title', t('shows.title')),
    ...(rows.length === 0 ? [el('p', 'shows-empty', t('shows.done'))] : rows.map((row) => {
      const item = document.createElement('button');
      item.className = `show-row show-row--${row.status}`;
      item.append(
        el('span', 'show-time', row.next),
        el('span', 'show-name', localName(row.venue.name, lang)),
        el('span', 'show-walk', `🚶 ${row.walkMin} min`),
        el('span', `show-status show-status--${row.status}`, t(STATUS_KEY[row.status]))
      );
      item.addEventListener('click', () => onVenueSelect(row.venue));
      return item;
    }))
  );
}

function el(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
