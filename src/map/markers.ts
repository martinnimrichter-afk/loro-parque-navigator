import * as maplibregl from 'maplibre-gl';
import type { Lang, LocalName, Poi } from '../types';
import { iconFor, poiIcon } from './icons';

export { iconFor, poiIcon };

/**
 * Show venues get an always-visible name label on the map; ids are the POIs
 * where the four daily shows actually run (plus anything tagged `show`).
 */
const LABELLED_POI_IDS = new Set([
  'node/6442111293',  // Orca Show
  'node/2652526870',  // Orca Ocean Show
  'node/2652526875',  // Loro Show
  'node/347312606',   // Sea Lions
  'node/3940354788'   // Dolphins (dolphinarium)
]);

export const hasLabel = (poi: Pick<Poi, 'id' | 'category'>): boolean =>
  poi.category === 'show' || LABELLED_POI_IDS.has(poi.id);

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
    if (hasLabel(poi)) {
      const label = document.createElement('span');
      label.className = 'poi-label';
      label.textContent = localName(poi.name, lang);
      el.append(label);
    }
    return new maplibregl.Marker({ element: el }).setLngLat([poi.lon, poi.lat]).addTo(map);
  });
}
