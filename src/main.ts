import * as maplibregl from 'maplibre-gl';
import './styles/tokens.css';
import './styles/app.css';
import { initMap } from './map/init';
import { addPoiMarkers } from './map/markers';
import { startTracking, effectivePosition, type LocationState } from './geo/location';
import { route } from './geo/route';
import { PARK_ENTRANCE } from './config';
import type { Graph, Poi } from './types';

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as const;

let locationState: LocationState = { status: 'pending', position: null };

const map = initMap('map');
const etaChip = document.getElementById('eta')!;
const pois: Poi[] = await (await fetch(`${import.meta.env.BASE_URL}data/pois.json`)).json();
const graph: Graph = await (await fetch(`${import.meta.env.BASE_URL}data/graph.json`)).json();

function clearRoute(): void {
  (map.getSource('route') as maplibregl.GeoJSONSource).setData(EMPTY_FC as never);
  etaChip.hidden = true;
}

function showRouteTo(target: { lat: number; lon: number }): void {
  const origin = effectivePosition(locationState, PARK_ENTRANCE);
  const r = route(graph, origin, target);
  if (!r) { clearRoute(); return; }
  (map.getSource('route') as maplibregl.GeoJSONSource).setData({
    type: 'Feature', properties: {},
    geometry: { type: 'LineString', coordinates: r.coords }
  } as never);
  etaChip.textContent = `🚶 ${Math.ceil(r.minutes)} min · ${Math.round(r.distM)} m`;
  etaChip.hidden = false;
}

map.on('load', () => {
  addPoiMarkers(map, pois, (poi) => showRouteTo(poi));
});
map.on('click', () => clearRoute());

const dot = document.createElement('div');
dot.className = 'me-dot';
const meMarker = new maplibregl.Marker({ element: dot });
startTracking(navigator.geolocation, (state) => {
  locationState = state;
  if (state.position) meMarker.setLngLat([state.position.lon, state.position.lat]).addTo(map);
});
