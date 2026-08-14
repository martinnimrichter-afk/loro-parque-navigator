import * as maplibregl from 'maplibre-gl';
import type { Lang, LocalName, Poi } from '../types';
import { iconFor, poiIcon } from './icons';

export { iconFor, poiIcon };

/**
 * POIs where the four daily shows actually run (plus anything tagged `show`)
 * — these keep their name label at every zoom level.
 */
const VENUE_POI_IDS = new Set([
  'node/6442111293',  // Orca Show
  'node/2652526870',  // Orca Ocean Show
  'node/2652526875',  // Loro Show
  'node/347312606',   // Sea Lions
  'node/3940354788'   // Dolphins (dolphinarium)
]);

/** Names OSM uses as bare category placeholders — labelling them adds nothing. */
const GENERIC_NAMES = new Set(['shop', 'toilets', 'info', 'entrance', 'food', 'map', 'mapa']);

export type LabelKind = 'always' | 'zoom' | null;

/**
 * Show venues are always labelled; other POIs with a real name get a label
 * that appears once zoomed in past the default whole-park view (the CSS gate
 * lives on `#map.labels-zoomed`); placeholder-named POIs stay icon-only.
 */
export function labelKind(poi: Pick<Poi, 'id' | 'category' | 'name'>): LabelKind {
  if (poi.category === 'show' || VENUE_POI_IDS.has(poi.id)) return 'always';
  if (GENERIC_NAMES.has(poi.name.en.trim().toLowerCase())) return null;
  return 'zoom';
}

export const localName = (name: LocalName, lang: Lang): string => name[lang] ?? name.en;

export function addPoiMarkers(
  map: maplibregl.Map,
  pois: Poi[],
  lang: Lang,
  onSelect: (poi: Poi) => void
): maplibregl.Marker[] {
  return pois.map((poi) => {
    const el = document.createElement('button');
    el.className = `poi poi--${poi.category}`;
    el.textContent = poiIcon(poi);
    el.setAttribute('aria-label', localName(poi.name, lang));
    el.addEventListener('click', (e) => { e.stopPropagation(); onSelect(poi); });
    const kind = labelKind(poi);
    if (kind) {
      const label = document.createElement('span');
      label.className = kind === 'always' ? 'poi-label' : 'poi-label poi-label--zoom';
      label.textContent = localName(poi.name, lang);
      el.append(label);
    }
    return new maplibregl.Marker({ element: el }).setLngLat([poi.lon, poi.lat]).addTo(map);
  });
}
