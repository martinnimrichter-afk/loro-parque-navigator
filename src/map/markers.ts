import * as maplibregl from 'maplibre-gl';
import type { Lang, LocalName, Poi, PoiCategory } from '../types';

const ICONS: Record<PoiCategory, string> = {
  animal: '🦜', show: '🎭', food: '🍽️', toilets: '🚻',
  shop: '🛍️', info: 'ℹ️', water: '🚰', entrance: '🚪'
};

export const iconFor = (category: PoiCategory): string => ICONS[category];

export const localName = (name: LocalName, lang: Lang): string => name[lang] ?? name.en;

export function addPoiMarkers(map: maplibregl.Map, pois: Poi[], onSelect: (poi: Poi) => void): void {
  for (const poi of pois) {
    const el = document.createElement('button');
    el.className = `poi poi--${poi.category}`;
    el.textContent = iconFor(poi.category);
    el.setAttribute('aria-label', poi.name.en);
    el.addEventListener('click', (e) => { e.stopPropagation(); onSelect(poi); });
    new maplibregl.Marker({ element: el }).setLngLat([poi.lon, poi.lat]).addTo(map);
  }
}
