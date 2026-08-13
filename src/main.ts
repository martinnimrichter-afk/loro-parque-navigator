import * as maplibregl from 'maplibre-gl';
import './styles/tokens.css';
import './styles/app.css';
import { initMap } from './map/init';
import { addPoiMarkers } from './map/markers';
import { startTracking, effectivePosition, type LocationState } from './geo/location';
import { route } from './geo/route';
import { loadShows } from './shows/schedule';
import { renderShowsPanel } from './ui/showsPanel';
import { createAboutDialog } from './ui/about';
import { detectLang, makeT } from './i18n/i18n';
import { PARK_ENTRANCE } from './config';
import pkg from '../package.json';
import type { Graph, Lang, Poi } from './types';

const EMPTY_FC = { type: 'FeatureCollection', features: [] } as const;
const SHOWS_REFRESH_MS = 30_000;
const SUPPORTED_LANGS: Lang[] = ['en', 'es', 'de'];
const SEEN_DISCLAIMER_KEY = 'lpn.seen-disclaimer';

let locationState: LocationState = { status: 'pending', position: null };
let lang: Lang = detectLang(navigator.language);
let t = makeT(lang);
let lastRouteTarget: { lat: number; lon: number } | null = null;

const map = initMap('map');
const etaChip = document.getElementById('eta')!;
const topbarEl = document.getElementById('topbar')!;
const appTitleEl = document.getElementById('app-title')!;
const appSubtitleEl = document.getElementById('app-subtitle')!;
const langSwitcherEl = document.getElementById('lang-switcher')!;
const showsListEl = document.getElementById('shows-list')!;
const showsMetaEl = document.getElementById('shows-meta')!;
const disclaimerEl = document.getElementById('disclaimer')!;

const pois: Poi[] = await (await fetch(`${import.meta.env.BASE_URL}data/pois.json`)).json();
const graph: Graph = await (await fetch(`${import.meta.env.BASE_URL}data/graph.json`)).json();
const { data: showsData, source: showsSource } = await loadShows(`${import.meta.env.BASE_URL}data/shows.json`);

function currentOrigin(): { lat: number; lon: number } {
  return effectivePosition(locationState, PARK_ENTRANCE);
}

function clearRoute(): void {
  lastRouteTarget = null;
  (map.getSource('route') as maplibregl.GeoJSONSource).setData(EMPTY_FC as never);
  etaChip.hidden = true;
}

function showRouteTo(target: { lat: number; lon: number }): void {
  lastRouteTarget = target;
  const origin = currentOrigin();
  const r = route(graph, origin, target);
  if (!r) { clearRoute(); return; }
  (map.getSource('route') as maplibregl.GeoJSONSource).setData({
    type: 'Feature', properties: {},
    geometry: { type: 'LineString', coordinates: r.coords }
  } as never);
  etaChip.textContent = `🚶 ${t('route.walk')} · ${Math.ceil(r.minutes)} min · ${Math.round(r.distM)} m`;
  etaChip.hidden = false;
}

function renderMeta(): void {
  const updated = document.createElement('span');
  updated.className = 'shows-meta-updated';
  updated.textContent = `${t('shows.updated')}: ${showsData.updated}`;
  const nodes = [updated];
  if (showsSource === 'fallback') {
    const offline = document.createElement('span');
    offline.className = 'shows-meta-offline';
    offline.textContent = t('shows.offlineNote');
    nodes.push(offline);
  }
  showsMetaEl.replaceChildren(...nodes);
}

function renderPanel(): void {
  renderShowsPanel({
    container: showsListEl,
    data: showsData,
    graph,
    origin: currentOrigin,
    now: () => new Date(),
    t,
    lang,
    onVenueSelect: (venue) => showRouteTo(venue)
  });
}

function makeAbout(): HTMLDialogElement {
  const dialog = createAboutDialog({ t, updated: showsData.updated, version: pkg.version });
  dialog.addEventListener('close', () => localStorage.setItem(SEEN_DISCLAIMER_KEY, '1'));
  return dialog;
}

function renderStaticText(): void {
  document.documentElement.lang = lang;
  appTitleEl.textContent = t('app.title');
  appSubtitleEl.textContent = t('app.subtitle');
  disclaimerEl.textContent = t('disclaimer.text');
  for (const btn of langSwitcherEl.querySelectorAll<HTMLButtonElement>('button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  }
}

function buildLangSwitcher(): void {
  langSwitcherEl.replaceChildren(
    ...SUPPORTED_LANGS.map((code) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = code.toUpperCase();
      btn.dataset.lang = code;
      btn.setAttribute('aria-pressed', String(code === lang));
      btn.addEventListener('click', () => setLang(code));
      return btn;
    })
  );
}

function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  t = makeT(lang);
  renderStaticText();
  renderMeta();
  renderPanel();
  rebuildAbout();
  if (lastRouteTarget) showRouteTo(lastRouteTarget);
}

// Rebuild instead of patching: the dialog's whole body is one `innerHTML` render keyed on `t`,
// so swapping in a fresh dialog is simpler than diffing its markup on every language switch.
function rebuildAbout(): void {
  const wasOpen = about.open;
  about.remove();
  about = makeAbout();
  if (wasOpen) about.showModal();
}

let about = makeAbout();

const infoBtn = document.createElement('button');
infoBtn.type = 'button';
infoBtn.className = 'topbar-info';
infoBtn.textContent = 'ⓘ';
infoBtn.setAttribute('aria-label', 'About');
infoBtn.addEventListener('click', () => about.showModal());
topbarEl.append(infoBtn);

buildLangSwitcher();
renderStaticText();
renderMeta();
renderPanel();
setInterval(renderPanel, SHOWS_REFRESH_MS);

if (!localStorage.getItem(SEEN_DISCLAIMER_KEY)) {
  about.showModal();
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
  renderPanel();
});
