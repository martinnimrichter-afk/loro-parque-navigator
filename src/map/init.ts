import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// Vite pre-bundles maplibre-gl's own worker-URL auto-detection into a path that
// doesn't have the sibling maplibre-gl-worker.mjs file next to it (dev deps cache
// and the production chunk both lack it), so the map silently never processes any
// source data. Importing the worker file as an asset URL and registering it
// explicitly keeps the worker resolvable in both dev and the production build.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { PARK_BOUNDS, PARK_ENTRANCE } from '../config';
import { buildStyle } from './style';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export function initMap(container: string | HTMLElement): maplibregl.Map {
  return new maplibregl.Map({
    container,
    style: buildStyle(`${import.meta.env.BASE_URL}data/park.geojson`),
    center: [PARK_ENTRANCE.lon, PARK_ENTRANCE.lat],
    zoom: 17,
    minZoom: 15.5,
    maxZoom: 20,
    maxBounds: [[PARK_BOUNDS[0], PARK_BOUNDS[1]], [PARK_BOUNDS[2], PARK_BOUNDS[3]]],
    attributionControl: { compact: true, customAttribution: '© OpenStreetMap contributors' }
  });
}
