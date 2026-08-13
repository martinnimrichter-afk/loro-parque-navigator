import type { StyleSpecification } from 'maplibre-gl';

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as const;

const isPolygon = ['==', ['geometry-type'], 'Polygon'];
const isLine = ['==', ['geometry-type'], 'LineString'];

export function buildStyle(parkDataUrl: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      park: { type: 'geojson', data: parkDataUrl },
      route: { type: 'geojson', data: EMPTY_FC as never }
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#EFE9DC' } },
      {
        id: 'greens', type: 'fill', source: 'park',
        filter: ['all', isPolygon, ['any', ['has', 'leisure'], ['has', 'landuse'], ['==', ['get', 'natural'], 'wood']]] as never,
        paint: { 'fill-color': '#CBE2BE' }
      },
      {
        id: 'water', type: 'fill', source: 'park',
        filter: ['all', isPolygon, ['any', ['==', ['get', 'natural'], 'water'], ['has', 'water']]] as never,
        paint: { 'fill-color': '#9FD3D8' }
      },
      {
        id: 'buildings', type: 'fill', source: 'park',
        filter: ['all', isPolygon, ['has', 'building']] as never,
        paint: { 'fill-color': '#E2D7C0', 'fill-outline-color': '#C9BCA0' }
      },
      {
        id: 'paths-casing', type: 'line', source: 'park',
        filter: ['all', isLine, ['has', 'highway']] as never,
        paint: { 'line-color': '#D8CFBB', 'line-width': ['interpolate', ['linear'], ['zoom'], 16, 4, 19, 12] as never }
      },
      {
        id: 'paths', type: 'line', source: 'park',
        filter: ['all', isLine, ['has', 'highway']] as never,
        paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 16, 2.5, 19, 9] as never }
      },
      {
        id: 'route', type: 'line', source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#E8613C', 'line-width': 5 }
      }
    ]
  };
}
