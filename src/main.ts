import * as maplibregl from 'maplibre-gl';
import './styles/tokens.css';
import './styles/app.css';
import { initMap } from './map/init';
import { addPoiMarkers } from './map/markers';
import { startTracking, type LocationState } from './geo/location';
import type { Poi } from './types';

let locationState: LocationState = { status: 'pending', position: null };

const map = initMap('map');
const pois: Poi[] = await (await fetch(`${import.meta.env.BASE_URL}data/pois.json`)).json();
map.on('load', () => {
  addPoiMarkers(map, pois, (poi) => {
    new maplibregl.Popup().setLngLat([poi.lon, poi.lat]).setText(poi.name.en).addTo(map);
  });
});

const dot = document.createElement('div');
dot.className = 'me-dot';
const meMarker = new maplibregl.Marker({ element: dot });
startTracking(navigator.geolocation, (state) => {
  locationState = state;
  if (state.position) meMarker.setLngLat([state.position.lon, state.position.lat]).addTo(map);
});
