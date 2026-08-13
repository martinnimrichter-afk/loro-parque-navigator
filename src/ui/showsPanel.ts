import { hhmmToMinutes } from '../shows/canimakeit';
import { activeEntries } from '../shows/schedule';
import { computeShowRow, type RowStatus, type ShowRow } from '../shows/showRow';
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

const STATUS_KEY: Record<RowStatus, string> = {
  easy: 'shows.easy', rush: 'shows.rush', missed: 'shows.missed', unreachable: 'shows.unreachable'
};

export function renderShowsPanel(deps: ShowsPanelDeps): void {
  const { container, data, graph, origin, now, t, lang, onVenueSelect } = deps;
  const current = now();
  const nowMin = current.getHours() * 60 + current.getMinutes();
  const isoDate = current.toISOString().slice(0, 10);
  const venueById = new Map(data.venues.map((v) => [v.id, v]));
  const currentOrigin = origin();

  const rows = activeEntries(data, isoDate)
    .map((entry) => computeShowRow(entry, venueById.get(entry.venueId), graph, currentOrigin, nowMin))
    .filter((row): row is ShowRow => row !== null)
    .sort((a, b) => hhmmToMinutes(a.next) - hhmmToMinutes(b.next));

  container.replaceChildren(
    el('h2', 'shows-title', t('shows.title')),
    ...(rows.length === 0 ? [el('p', 'shows-empty', t('shows.done'))] : rows.map((row) => {
      const item = document.createElement('button');
      item.className = `show-row show-row--${row.status}`;
      const walkChip = row.walkMin === null ? [] : [el('span', 'show-walk', `🚶 ${row.walkMin} min`)];
      item.append(
        el('span', 'show-time', row.next),
        el('span', 'show-name', localName(row.venue.name, lang)),
        ...walkChip,
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
