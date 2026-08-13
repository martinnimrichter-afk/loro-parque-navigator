import * as maplibregl from 'maplibre-gl';
import './styles/tokens.css';
import './styles/app.css';
import { initMap } from './map/init';
import { addPoiMarkers } from './map/markers';
import type { Poi } from './types';

const map = initMap('map');
const pois: Poi[] = await (await fetch(`${import.meta.env.BASE_URL}data/pois.json`)).json();
map.on('load', () => {
  addPoiMarkers(map, pois, (poi) => {
    new maplibregl.Popup().setLngLat([poi.lon, poi.lat]).setText(poi.name.en).addTo(map);
  });
});
