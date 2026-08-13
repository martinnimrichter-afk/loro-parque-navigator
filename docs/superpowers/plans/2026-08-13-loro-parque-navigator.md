# Loro Parque Navigator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public, unofficial offline-first PWA for Loro Parque visitors: custom park map, GPS position, walking navigation to POIs, and a "can I make the show?" feature.

**Architecture:** Static PWA with no backend. Build-time data pipeline (Overpass → GeoJSON → POI list + routing graph, all committed to the repo). MapLibre GL renders the park directly from bundled GeoJSON with a custom style (no tiles). Client-side Dijkstra routing. Show times live in a static `shows.json` served next to the app (NetworkFirst caching). Deployed to GitHub Pages.

**Tech Stack:** Vite + vanilla TypeScript (no framework), MapLibre GL JS, osmtogeojson (build scripts), vite-plugin-pwa (Workbox), Vitest, Playwright.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-13-loro-parque-navigator-design.md` — read it before starting any task.
- UI languages: **EN / ES / DE** via i18n dictionaries; no hardcoded UI strings outside `src/i18n/dict/*.json` (from Task 12 on; earlier tasks may use temporary EN strings that Task 12 migrates).
- Unofficial branding: app name "Park Navigator", subtitle "Unofficial Loro Parque visitor guide". Never use park logos. Disclaimer required (Task 13).
- Code and comments in English. Commit messages `<type>: <description>` (feat/fix/refactor/docs/test/chore), no AI attribution lines.
- TypeScript `strict: true`. Immutability preferred (no in-place mutation of shared structures). Files ≤ 400 lines, functions ≤ 50 lines.
- Coverage ≥ 80 % on logic modules (`src/geo`, `src/shows`, `src/i18n`, `scripts/lib`). UI wiring is covered by the Playwright smoke test instead.
- Dev machine is Windows (PowerShell). All scripts must be cross-platform Node ≥ 20 `.mjs` — no bash-isms in npm scripts.
- No secrets anywhere (project has none — keep it that way).
- Park entrance GPS: `28.4082, -16.5659`. Walking speed 3.5 km/h. Vite base path: `/loro-parque-navigator/`.
- Known accepted duplication: `haversineM` + `centroidOf` exist twice (`scripts/lib/geo.mjs` for Node build scripts, `src/geo/distance.ts` for the app) because the two runtimes don't share a module format here. Keep both in sync (≈15 lines).

---

### Task 1: Project scaffold + haversine utility

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/types.ts`, `src/config.ts`, `src/geo/distance.ts`, `src/geo/distance.test.ts`

**Interfaces:**
- Produces: `haversineM(lat1, lon1, lat2, lon2): number` (meters); `src/types.ts` type definitions used by every later task; `src/config.ts` constants `PARK_ENTRANCE`, `WALK_SPEED_KMH`, `PARK_BOUNDS`.

- [ ] **Step 1: Scaffold by hand (deterministic — no interactive `npm create`)**

`package.json`:
```json
{
  "name": "loro-parque-navigator",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "data:fetch": "node scripts/fetch-osm.mjs",
    "data:build": "node scripts/build-data.mjs"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/loro-parque-navigator/',
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    coverage: { provider: 'v8', include: ['src/**', 'scripts/lib/**'], exclude: ['src/main.ts', 'src/ui/**', 'src/map/init.ts'] }
  }
} as never);
```
(The `as never` silences the TS complaint about the `test` key until vitest types are wired; replace with `/// <reference types="vitest" />` + typed config if the implementer prefers.)

`.gitignore`:
```
node_modules/
dist/
data/raw/
coverage/
test-results/
```

`index.html` (minimal shell, extended in Task 6):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Park Navigator</title>
  </head>
  <body>
    <div id="map"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts` for now: `console.log('park navigator');` (replaced in Task 6).

`src/types.ts`:
```ts
export type Lang = 'en' | 'es' | 'de';

export interface LocalName { en: string; es?: string; de?: string; }

export type PoiCategory = 'animal' | 'show' | 'food' | 'toilets' | 'shop' | 'info' | 'water' | 'entrance';

export interface Poi {
  id: string;
  category: PoiCategory;
  name: LocalName;
  lat: number;
  lon: number;
}

export interface GraphNode { id: number; lat: number; lon: number; }

/** edges: [fromNodeId, toNodeId, distanceMeters] — undirected */
export interface Graph { nodes: GraphNode[]; edges: [number, number, number][]; }

export interface Venue { id: string; name: LocalName; lat: number; lon: number; }

export interface ShowEntry { venueId: string; times: string[]; validFrom?: string; validTo?: string; }

export interface ShowsData { updated: string; timezone: string; venues: Venue[]; shows: ShowEntry[]; }
```

`src/config.ts`:
```ts
export const PARK_ENTRANCE = { lat: 28.4082, lon: -16.5659 };
export const WALK_SPEED_KMH = 3.5;
/** [west, south, east, north] — generous box around the park for map maxBounds */
export const PARK_BOUNDS: [number, number, number, number] = [-16.573, 28.403, -16.561, 28.412];
```

- [ ] **Step 2: Install dependencies**

```powershell
npm install maplibre-gl
npm install -D vite typescript vitest @vitest/coverage-v8
```

- [ ] **Step 3: Write the failing test** — `src/geo/distance.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { haversineM } from './distance';

describe('haversineM', () => {
  test('returns 0 for identical points', () => {
    expect(haversineM(28.4082, -16.5659, 28.4082, -16.5659)).toBe(0);
  });

  test('measures ~98 m for 0.001° longitude at park latitude', () => {
    const d = haversineM(28.4082, -16.5659, 28.4082, -16.5649);
    expect(d).toBeGreaterThan(95);
    expect(d).toBeLessThan(101);
  });

  test('is symmetric', () => {
    const a = haversineM(28.4082, -16.5659, 28.4079, -16.5689);
    const b = haversineM(28.4079, -16.5689, 28.4082, -16.5659);
    expect(a).toBeCloseTo(b, 6);
  });
});
```

- [ ] **Step 4: Run test to verify it fails** — `npm test` → FAIL (`distance` module missing).

- [ ] **Step 5: Implement** — `src/geo/distance.ts`:

```ts
const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
```

- [ ] **Step 6: Run tests** — `npm test` → PASS. Also `npm run build` → succeeds.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: scaffold Vite+TS project with haversine utility"
```

---

### Task 2: Overpass fetch script

**Files:**
- Create: `scripts/overpass.ql`, `scripts/fetch-osm.mjs`

**Interfaces:**
- Produces: `data/raw/overpass.json` (raw Overpass response; git-ignored). Consumed by Task 3.

- [ ] **Step 1: Write the query** — `scripts/overpass.ql`:

```
[out:json][timeout:90];
( way["name"="Loro Parque"][tourism];
  relation["name"="Loro Parque"][tourism]; );
map_to_area ->.park;
(
  way(area.park)[highway];
  way(area.park)[building];
  way(area.park)["natural"="water"];
  way(area.park)[water];
  way(area.park)[leisure];
  way(area.park)[landuse];
  way(area.park)[tourism];
  way(area.park)[amenity];
  way(area.park)[attraction];
  way(area.park)[zoo];
  node(area.park)[tourism];
  node(area.park)[amenity];
  node(area.park)[shop];
  node(area.park)[attraction];
  node(area.park)[zoo];
  node(area.park)[entrance];
);
out body;
>;
out skel qt;
```

- [ ] **Step 2: Write the fetch script** — `scripts/fetch-osm.mjs`:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const query = await readFile(new URL('./overpass.ql', import.meta.url), 'utf8');
const res = await fetch(OVERPASS_URL, {
  method: 'POST',
  body: new URLSearchParams({ data: query })
});
if (!res.ok) {
  console.error(`Overpass request failed: HTTP ${res.status}`);
  process.exit(1);
}
const json = await res.json();
if (!Array.isArray(json.elements) || json.elements.length === 0) {
  console.error('Overpass returned no elements — check the query / park name tags.');
  process.exit(1);
}
await mkdir('data/raw', { recursive: true });
await writeFile('data/raw/overpass.json', JSON.stringify(json));
console.log(`Saved ${json.elements.length} OSM elements to data/raw/overpass.json`);
```

- [ ] **Step 3: Verify by running it** — `npm run data:fetch`
Expected: `Saved <N> OSM elements...` with N in the hundreds/thousands. If it exits with "no elements", inspect the park's actual OSM tags at openstreetmap.org (search "Loro Parque") and adjust the two seed lines of the query (this is the only expected point of variance).

- [ ] **Step 4: Commit** (script + query only; `data/raw/` is git-ignored)

```powershell
git add scripts/
git commit -m "feat: add Overpass fetch script for park OSM data"
```

---

### Task 3: GeoJSON conversion + POI extraction

**Files:**
- Create: `scripts/lib/geo.mjs`, `scripts/lib/poi.mjs`, `scripts/lib/poi.test.mjs`, `scripts/build-data.mjs`

**Interfaces:**
- Consumes: `data/raw/overpass.json` (Task 2).
- Produces: `public/data/park.geojson` (FeatureCollection, committed), `public/data/pois.json` (`Poi[]`, committed); library functions `categorize(props) -> category|null`, `toPoi(feature) -> Poi|null`, `buildPois(features) -> Poi[]`, `centroidOf(geometry) -> [lon, lat]`, `haversineM(...)` (Node copy).

- [ ] **Step 1: Install script dependency** — `npm install -D osmtogeojson`

- [ ] **Step 2: Write `scripts/lib/geo.mjs`** (Node copy of geometry helpers):

```js
const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

export function haversineM(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Returns [lon, lat] representative point for Point/LineString/Polygon geometry. */
export function centroidOf(geometry) {
  if (geometry.type === 'Point') return geometry.coordinates;
  const ring = geometry.type === 'Polygon'
    ? geometry.coordinates[0].slice(0, -1)
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates[0][0].slice(0, -1)
      : geometry.coordinates;
  const [sx, sy] = ring.reduce(([ax, ay], [x, y]) => [ax + x, ay + y], [0, 0]);
  return [sx / ring.length, sy / ring.length];
}
```

- [ ] **Step 3: Write the failing tests** — `scripts/lib/poi.test.mjs`:

```js
import { describe, expect, test } from 'vitest';
import { buildPois, categorize, toPoi } from './poi.mjs';

describe('categorize', () => {
  test('zoo enclosure is animal', () => {
    expect(categorize({ zoo: 'enclosure', name: 'Orcas' })).toBe('animal');
  });
  test('attraction=animal is animal', () => {
    expect(categorize({ attraction: 'animal' })).toBe('animal');
  });
  test('restaurant and cafe are food', () => {
    expect(categorize({ amenity: 'restaurant' })).toBe('food');
    expect(categorize({ amenity: 'cafe' })).toBe('food');
  });
  test('toilets, drinking water, shop, info, main entrance', () => {
    expect(categorize({ amenity: 'toilets' })).toBe('toilets');
    expect(categorize({ amenity: 'drinking_water' })).toBe('water');
    expect(categorize({ shop: 'gift' })).toBe('shop');
    expect(categorize({ tourism: 'information' })).toBe('info');
    expect(categorize({ entrance: 'main' })).toBe('entrance');
  });
  test('theatre is show venue', () => {
    expect(categorize({ amenity: 'theatre' })).toBe('show');
  });
  test('plain highway props are not a POI', () => {
    expect(categorize({ highway: 'footway' })).toBeNull();
    expect(categorize(undefined)).toBeNull();
  });
});

describe('toPoi', () => {
  const feature = {
    id: 'way/123',
    properties: { zoo: 'enclosure', name: 'Orca Ocean', 'name:de': 'Orca-Ozean' },
    geometry: { type: 'Polygon', coordinates: [[[-16.569, 28.408], [-16.568, 28.408], [-16.568, 28.409], [-16.569, 28.408]]] }
  };

  test('builds Poi with localized names and centroid', () => {
    const poi = toPoi(feature);
    expect(poi).toMatchObject({ id: 'way/123', category: 'animal' });
    expect(poi.name.en).toBe('Orca Ocean');
    expect(poi.name.de).toBe('Orca-Ozean');
    expect(poi.lon).toBeCloseTo(-16.5685, 3);
    expect(poi.lat).toBeCloseTo(28.4083, 3);
  });

  test('drops unnamed animal enclosures (noise)', () => {
    expect(toPoi({ ...feature, properties: { zoo: 'enclosure' } })).toBeNull();
  });

  test('keeps unnamed toilets (name falls back to category)', () => {
    const p = toPoi({ ...feature, properties: { amenity: 'toilets' } });
    expect(p).not.toBeNull();
    expect(p.name.en).toBe('toilets');
  });
});

describe('buildPois', () => {
  test('filters non-POI features and dedupes by id', () => {
    const path = { id: 'way/1', properties: { highway: 'footway' }, geometry: { type: 'LineString', coordinates: [[-16.57, 28.41], [-16.569, 28.41]] } };
    const pois = buildPois([path, feature(), feature()]);
    expect(pois).toHaveLength(1);
  });
  function feature() {
    return {
      id: 'node/5', properties: { amenity: 'toilets' },
      geometry: { type: 'Point', coordinates: [-16.566, 28.409] }
    };
  }
});
```

- [ ] **Step 4: Run tests to verify they fail** — `npm test` → FAIL (`poi.mjs` missing).

- [ ] **Step 5: Implement** — `scripts/lib/poi.mjs`:

```js
import { centroidOf } from './geo.mjs';

const FOOD_AMENITIES = new Set(['restaurant', 'cafe', 'fast_food', 'bar', 'ice_cream', 'food_court']);

export function categorize(props) {
  if (!props) return null;
  if (props.zoo === 'enclosure' || props.attraction === 'animal') return 'animal';
  if (props.amenity === 'theatre' || props.zoo === 'show') return 'show';
  if (FOOD_AMENITIES.has(props.amenity)) return 'food';
  if (props.amenity === 'toilets') return 'toilets';
  if (props.amenity === 'drinking_water') return 'water';
  if (props.shop) return 'shop';
  if (props.tourism === 'information') return 'info';
  if (props.entrance === 'main') return 'entrance';
  if (props.tourism === 'attraction') return 'animal';
  return null;
}

export function toPoi(feature) {
  const props = feature.properties ?? {};
  const category = categorize(props);
  if (!category) return null;
  const baseName = props.name ?? null;
  if (!baseName && (category === 'animal' || category === 'show')) return null;
  const [lon, lat] = centroidOf(feature.geometry);
  const name = { en: props['name:en'] ?? baseName ?? category };
  if (props['name:es']) name.es = props['name:es'];
  if (props['name:de']) name.de = props['name:de'];
  return { id: String(feature.id), category, name, lat, lon };
}

export function buildPois(features) {
  const seen = new Set();
  return features
    .map(toPoi)
    .filter((p) => p !== null)
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}
```

- [ ] **Step 6: Run tests** — `npm test` → PASS.

- [ ] **Step 7: Write the orchestrator** — `scripts/build-data.mjs` (graph part arrives in Task 5):

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import osmtogeojson from 'osmtogeojson';
import { buildPois } from './lib/poi.mjs';

const raw = JSON.parse(await readFile('data/raw/overpass.json', 'utf8'));
const geojson = osmtogeojson(raw);
const pois = buildPois(geojson.features);

await mkdir('public/data', { recursive: true });
await writeFile('public/data/park.geojson', JSON.stringify(geojson));
await writeFile('public/data/pois.json', JSON.stringify(pois, null, 2));
console.log(`park.geojson: ${geojson.features.length} features, pois.json: ${pois.length} POIs`);
```

- [ ] **Step 8: Run the pipeline** — `npm run data:build`
Expected: both files exist under `public/data/`, POI count > 20. Spot-check `pois.json` by eye: entries should include recognizable names (Orca Ocean, toilets, restaurants…).

- [ ] **Step 9: Commit** (generated data IS committed — the build must not need network)

```powershell
git add -A
git commit -m "feat: OSM to GeoJSON conversion with POI extraction"
```

---

### Task 4: Manual overrides layer

**Files:**
- Create: `scripts/lib/overrides.mjs`, `scripts/lib/overrides.test.mjs`, `data/overrides.json`
- Modify: `scripts/build-data.mjs`

**Interfaces:**
- Produces: `applyOverrides(pois, overrides) -> Poi[]` (pure, returns new array). `data/overrides.json` shape: `{ "add": Poi[], "update": [{ "id": string, "set": Partial<Poi> }], "remove": string[] }`.

- [ ] **Step 1: Write the failing tests** — `scripts/lib/overrides.test.mjs`:

```js
import { describe, expect, test } from 'vitest';
import { applyOverrides } from './overrides.mjs';

const pois = [
  { id: 'a', category: 'animal', name: { en: 'Orcas' }, lat: 1, lon: 2 },
  { id: 'b', category: 'food', name: { en: 'Cafe' }, lat: 3, lon: 4 }
];

describe('applyOverrides', () => {
  test('removes by id', () => {
    const out = applyOverrides(pois, { add: [], update: [], remove: ['b'] });
    expect(out.map((p) => p.id)).toEqual(['a']);
  });

  test('updates fields without mutating input', () => {
    const out = applyOverrides(pois, { add: [], update: [{ id: 'a', set: { lat: 9 } }], remove: [] });
    expect(out.find((p) => p.id === 'a').lat).toBe(9);
    expect(pois[0].lat).toBe(1);
  });

  test('appends added POIs', () => {
    const extra = { id: 'x', category: 'show', name: { en: 'Parrot Show' }, lat: 5, lon: 6 };
    const out = applyOverrides(pois, { add: [extra], update: [], remove: [] });
    expect(out).toHaveLength(3);
    expect(out.at(-1).id).toBe('x');
  });

  test('tolerates missing keys in overrides object', () => {
    expect(applyOverrides(pois, {})).toEqual(pois);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `scripts/lib/overrides.mjs`:

```js
export function applyOverrides(pois, overrides) {
  const removed = new Set(overrides.remove ?? []);
  const updates = new Map((overrides.update ?? []).map((u) => [u.id, u.set]));
  const kept = pois
    .filter((p) => !removed.has(p.id))
    .map((p) => (updates.has(p.id) ? { ...p, ...updates.get(p.id) } : p));
  return [...kept, ...(overrides.add ?? [])];
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Wire into the pipeline** — `data/overrides.json`:

```json
{ "add": [], "update": [], "remove": [] }
```

In `scripts/build-data.mjs`, after `buildPois`:

```js
import { applyOverrides } from './lib/overrides.mjs';
const overrides = JSON.parse(await readFile('data/overrides.json', 'utf8'));
const finalPois = applyOverrides(pois, overrides);
```
…and write `finalPois` instead of `pois`. Re-run `npm run data:build` — output unchanged (empty overrides).

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: manual POI overrides layer (field fixes survive OSM re-imports)"
```

---

### Task 5: Routing graph builder

**Files:**
- Create: `scripts/lib/graph.mjs`, `scripts/lib/graph.test.mjs`
- Modify: `scripts/build-data.mjs`

**Interfaces:**
- Produces: `buildGraph(features) -> Graph` where `Graph = { nodes: [{id, lat, lon}], edges: [[fromId, toId, distM]] }` (matches `src/types.ts` `Graph`); output file `public/data/graph.json` (committed). Consumed by Tasks 8–9.

- [ ] **Step 1: Write the failing tests** — `scripts/lib/graph.test.mjs`:

```js
import { describe, expect, test } from 'vitest';
import { buildGraph } from './graph.mjs';

const path = (id, coords, highway = 'footway') => ({
  id, properties: { highway }, geometry: { type: 'LineString', coordinates: coords }
});

describe('buildGraph', () => {
  test('one two-point path becomes 2 nodes and 1 edge with real distance', () => {
    const g = buildGraph([path('w1', [[-16.5659, 28.4082], [-16.5649, 28.4082]])]);
    expect(g.nodes).toHaveLength(2);
    expect(g.edges).toHaveLength(1);
    const [, , dist] = g.edges[0];
    expect(dist).toBeGreaterThan(95);
    expect(dist).toBeLessThan(101);
  });

  test('paths sharing an endpoint share one node (junction)', () => {
    const shared = [-16.5649, 28.4082];
    const g = buildGraph([
      path('w1', [[-16.5659, 28.4082], shared]),
      path('w2', [shared, [-16.5649, 28.4092]])
    ]);
    expect(g.nodes).toHaveLength(3);
    expect(g.edges).toHaveLength(2);
  });

  test('non-walkable and non-line features are ignored', () => {
    const g = buildGraph([
      path('w1', [[-16.566, 28.408], [-16.565, 28.408]], 'motorway'),
      { id: 'n1', properties: { amenity: 'toilets' }, geometry: { type: 'Point', coordinates: [-16.566, 28.408] } }
    ]);
    expect(g.nodes).toHaveLength(0);
    expect(g.edges).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `scripts/lib/graph.mjs`:

```js
import { haversineM } from './geo.mjs';

const WALKABLE = new Set(['footway', 'path', 'pedestrian', 'steps', 'track', 'service', 'residential', 'living_street']);

export function buildGraph(features) {
  const nodeIdByKey = new Map();
  const nodes = [];
  const edges = [];

  const nodeIdFor = (lon, lat) => {
    const key = `${lon.toFixed(6)},${lat.toFixed(6)}`;
    const existing = nodeIdByKey.get(key);
    if (existing !== undefined) return existing;
    const id = nodes.length;
    nodeIdByKey.set(key, id);
    nodes.push({ id, lat, lon });
    return id;
  };

  for (const f of features) {
    if (f.geometry?.type !== 'LineString') continue;
    if (!WALKABLE.has(f.properties?.highway)) continue;
    const coords = f.geometry.coordinates;
    for (let i = 1; i < coords.length; i++) {
      const [lon1, lat1] = coords[i - 1];
      const [lon2, lat2] = coords[i];
      const a = nodeIdFor(lon1, lat1);
      const b = nodeIdFor(lon2, lat2);
      if (a === b) continue;
      edges.push([a, b, haversineM(lat1, lon1, lat2, lon2)]);
    }
  }
  return { nodes, edges };
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Wire into pipeline** — in `scripts/build-data.mjs` add:

```js
import { buildGraph } from './lib/graph.mjs';
const graph = buildGraph(geojson.features);
await writeFile('public/data/graph.json', JSON.stringify(graph));
console.log(`graph.json: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
```
Run `npm run data:build` — expect a few hundred to a few thousand nodes. If 0 nodes: park paths use a highway value missing from `WALKABLE` — inspect `park.geojson`, extend the set.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: build walking graph from OSM footpaths"
```

---

### Task 6: Map shell — MapLibre with custom GeoJSON style

**Files:**
- Create: `src/map/style.ts`, `src/map/style.test.ts`, `src/map/init.ts`, `src/styles/tokens.css`, `src/styles/app.css`
- Modify: `index.html`, `src/main.ts`

**Interfaces:**
- Produces: `buildStyle(parkDataUrl: string): StyleSpecification` (sources `park` + `route`, layer id `route` exists — Task 9 updates the `route` source's data); `initMap(container: string | HTMLElement): maplibregl.Map` (bounded to `PARK_BOUNDS`, minZoom 15.5, maxZoom 20).

- [ ] **Step 1: Write the failing test** — `src/map/style.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { buildStyle } from './style';

describe('buildStyle', () => {
  const style = buildStyle('data/park.geojson');

  test('declares park and route sources', () => {
    expect(Object.keys(style.sources)).toEqual(expect.arrayContaining(['park', 'route']));
  });

  test('every layer references a declared source (background excepted)', () => {
    for (const layer of style.layers) {
      if (layer.type === 'background') continue;
      expect(style.sources).toHaveProperty((layer as { source: string }).source);
    }
  });

  test('route layer is drawn above the path layers', () => {
    const ids = style.layers.map((l) => l.id);
    expect(ids.indexOf('route')).toBeGreaterThan(ids.indexOf('paths'));
  });

  test('uses no glyphs or sprites (labels are DOM markers, offline-safe)', () => {
    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `src/map/style.ts`:

```ts
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
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Map init + shell** — `src/map/init.ts`:

```ts
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { PARK_BOUNDS, PARK_ENTRANCE } from '../config';
import { buildStyle } from './style';

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
```

`src/styles/tokens.css` (design tokens — tropical park palette, one place for all colors):

```css
:root {
  --color-surface: #efe9dc;
  --color-ink: #22301f;
  --color-accent: #e8613c;
  --color-primary: #0f766e;
  --color-easy: #15803d;
  --color-rush: #d97706;
  --color-missed: #b91c1c;
  --radius-panel: 16px 16px 0 0;
  --shadow-panel: 0 -4px 24px rgb(0 0 0 / 0.15);
  --font-ui: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
```

`src/styles/app.css`:

```css
* { margin: 0; box-sizing: border-box; }
html, body, #map { height: 100%; font-family: var(--font-ui); }
#map { position: fixed; inset: 0; }
```

`src/main.ts`:

```ts
import './styles/tokens.css';
import './styles/app.css';
import { initMap } from './map/init';

initMap('map');
```

- [ ] **Step 6: Verify visually** — `npm run dev`, open the printed URL. Expected: stylized park map (sand background, green areas, white paths, water) centered on the entrance. `npm run build` passes.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: MapLibre park map with custom GeoJSON style"
```

---

### Task 7: POI markers with emoji icons

**Files:**
- Create: `src/map/markers.ts`, `src/map/markers.test.ts`
- Modify: `src/main.ts`, `src/styles/app.css`

**Interfaces:**
- Consumes: `public/data/pois.json` (`Poi[]`), map from Task 6.
- Produces: `iconFor(category: PoiCategory): string`; `addPoiMarkers(map, pois, onSelect: (poi: Poi) => void): void`; `localName(name: LocalName, lang: Lang): string`. Task 9 passes an `onSelect` that routes to the POI; until then `onSelect` shows a popup.

- [ ] **Step 1: Write the failing test** — `src/map/markers.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { iconFor, localName } from './markers';

describe('iconFor', () => {
  test('maps every category to a distinct emoji', () => {
    const cats = ['animal', 'show', 'food', 'toilets', 'shop', 'info', 'water', 'entrance'] as const;
    const icons = cats.map(iconFor);
    expect(new Set(icons).size).toBe(cats.length);
    for (const icon of icons) expect(icon.length).toBeGreaterThan(0);
  });
});

describe('localName', () => {
  test('prefers requested language, falls back to en', () => {
    expect(localName({ en: 'Orcas', de: 'Orcas (DE)' }, 'de')).toBe('Orcas (DE)');
    expect(localName({ en: 'Orcas' }, 'es')).toBe('Orcas');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `src/map/markers.ts`:

```ts
import maplibregl from 'maplibre-gl';
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
```

Marker CSS in `src/styles/app.css`:

```css
.poi {
  border: none; background: #fff; border-radius: 50%;
  width: 30px; height: 30px; font-size: 16px; line-height: 1;
  box-shadow: 0 1px 4px rgb(0 0 0 / 0.25); cursor: pointer;
}
.poi:active { transform: scale(1.15); }
```

- [ ] **Step 4: Wire in `src/main.ts`** — fetch POIs, add markers, temporary popup on select:

```ts
import maplibregl from 'maplibre-gl';
import { addPoiMarkers } from './map/markers';
import type { Poi } from './types';

const map = initMap('map');
const pois: Poi[] = await (await fetch(`${import.meta.env.BASE_URL}data/pois.json`)).json();
map.on('load', () => {
  addPoiMarkers(map, pois, (poi) => {
    new maplibregl.Popup().setLngLat([poi.lon, poi.lat]).setText(poi.name.en).addTo(map);
  });
});
```

- [ ] **Step 5: Run tests + verify visually** — `npm test` → PASS; `npm run dev` → emoji markers on the map, tap opens a name popup.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "feat: POI markers with emoji icons and localized names"
```

---

### Task 8: GPS tracking with entrance fallback

**Files:**
- Create: `src/geo/location.ts`, `src/geo/location.test.ts`
- Modify: `src/main.ts`, `src/styles/app.css`

**Interfaces:**
- Produces: `LocationState = { status: 'pending'|'granted'|'denied'|'unavailable'; position: { lat, lon, accuracy } | null }`; `startTracking(geolocation, onChange): () => void` (returns stop function); `effectivePosition(state, fallback) -> { lat, lon }`. Tasks 9 & 11 call `effectivePosition(state, PARK_ENTRANCE)` as the routing origin.

- [ ] **Step 1: Write the failing tests** — `src/geo/location.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest';
import { effectivePosition, startTracking, type LocationState } from './location';

const ENTRANCE = { lat: 28.4082, lon: -16.5659 };

describe('effectivePosition', () => {
  test('uses GPS position when granted', () => {
    const state: LocationState = { status: 'granted', position: { lat: 28.409, lon: -16.567, accuracy: 5 } };
    expect(effectivePosition(state, ENTRANCE)).toEqual({ lat: 28.409, lon: -16.567 });
  });
  test('falls back to entrance when denied or pending', () => {
    expect(effectivePosition({ status: 'denied', position: null }, ENTRANCE)).toEqual(ENTRANCE);
    expect(effectivePosition({ status: 'pending', position: null }, ENTRANCE)).toEqual(ENTRANCE);
  });
});

describe('startTracking', () => {
  test('reports unavailable without geolocation API', () => {
    const onChange = vi.fn();
    startTracking(undefined, onChange);
    expect(onChange).toHaveBeenCalledWith({ status: 'unavailable', position: null });
  });

  test('reports positions and denial via the callback', () => {
    const onChange = vi.fn();
    let success: PositionCallback = () => {};
    let failure: PositionErrorCallback = () => {};
    const fakeGeo = {
      watchPosition: (s: PositionCallback, f: PositionErrorCallback) => { success = s; failure = f; return 7; },
      clearWatch: vi.fn()
    } as unknown as Geolocation;

    const stop = startTracking(fakeGeo, onChange);
    expect(onChange).toHaveBeenCalledWith({ status: 'pending', position: null });

    success({ coords: { latitude: 28.41, longitude: -16.57, accuracy: 8 } } as GeolocationPosition);
    expect(onChange).toHaveBeenLastCalledWith({ status: 'granted', position: { lat: 28.41, lon: -16.57, accuracy: 8 } });

    failure({ code: 1 } as GeolocationPositionError);
    expect(onChange).toHaveBeenLastCalledWith({ status: 'denied', position: null });

    stop();
    expect(fakeGeo.clearWatch).toHaveBeenCalledWith(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `src/geo/location.ts`:

```ts
export interface Position { lat: number; lon: number; accuracy: number; }
export interface LocationState {
  status: 'pending' | 'granted' | 'denied' | 'unavailable';
  position: Position | null;
}

export function startTracking(
  geolocation: Geolocation | undefined,
  onChange: (state: LocationState) => void
): () => void {
  if (!geolocation) {
    onChange({ status: 'unavailable', position: null });
    return () => {};
  }
  onChange({ status: 'pending', position: null });
  const watchId = geolocation.watchPosition(
    (pos) => onChange({
      status: 'granted',
      position: { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }
    }),
    () => onChange({ status: 'denied', position: null }),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
  return () => geolocation.clearWatch(watchId);
}

export function effectivePosition(
  state: LocationState,
  fallback: { lat: number; lon: number }
): { lat: number; lon: number } {
  return state.position ? { lat: state.position.lat, lon: state.position.lon } : fallback;
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Wire in `src/main.ts`** — keep latest state in a module-level `let locationState`, blue dot marker:

```ts
import { startTracking, type LocationState } from './geo/location';

let locationState: LocationState = { status: 'pending', position: null };
const dot = document.createElement('div');
dot.className = 'me-dot';
const meMarker = new maplibregl.Marker({ element: dot });
startTracking(navigator.geolocation, (state) => {
  locationState = state;
  if (state.position) meMarker.setLngLat([state.position.lon, state.position.lat]).addTo(map);
});
```

CSS: `.me-dot { width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 0 0 2px rgb(37 99 235 / .4); }`

- [ ] **Step 6: Verify** — `npm run dev`, allow location → blue dot appears (desktop GPS may be coarse; that's fine). Deny → no dot, no errors in console.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: GPS tracking with graceful entrance fallback"
```

---

### Task 9: Client routing — Dijkstra + route to POI

**Files:**
- Create: `src/geo/dijkstra.ts`, `src/geo/dijkstra.test.ts`, `src/geo/route.ts`, `src/geo/route.test.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `Graph` from `public/data/graph.json`, `haversineM` (Task 1), `effectivePosition` (Task 8).
- Produces: `shortestPath(graph, fromId, toId) -> { distM, nodeIds } | null`; `nearestNodeId(graph, lat, lon) -> number | null`; `walkMinutes(distM) -> number`; `route(graph, from, to) -> { distM, minutes, coords: [number, number][] } | null` (coords are `[lon, lat]`, ready for GeoJSON). Task 11 reuses `route(...)` for show reachability.

- [ ] **Step 1: Write the failing Dijkstra tests** — `src/geo/dijkstra.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { shortestPath } from './dijkstra';
import type { Graph } from '../types';

// square with a diagonal shortcut: 0-1-2 along edges (20m), 0-2 direct (25m)
const graph: Graph = {
  nodes: [
    { id: 0, lat: 0, lon: 0 }, { id: 1, lat: 0, lon: 1 },
    { id: 2, lat: 1, lon: 1 }, { id: 3, lat: 9, lon: 9 }
  ],
  edges: [[0, 1, 10], [1, 2, 10], [0, 2, 25]]
};

describe('shortestPath', () => {
  test('picks the cheaper multi-hop route over the expensive direct edge', () => {
    const r = shortestPath(graph, 0, 2);
    expect(r?.distM).toBe(20);
    expect(r?.nodeIds).toEqual([0, 1, 2]);
  });
  test('works in reverse direction (undirected edges)', () => {
    expect(shortestPath(graph, 2, 0)?.nodeIds).toEqual([2, 1, 0]);
  });
  test('returns null for unreachable node', () => {
    expect(shortestPath(graph, 0, 3)).toBeNull();
  });
  test('from == to gives zero-length path', () => {
    expect(shortestPath(graph, 1, 1)).toEqual({ distM: 0, nodeIds: [1] });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement** — `src/geo/dijkstra.ts`:

```ts
import type { Graph } from '../types';

export function shortestPath(
  graph: Graph, from: number, to: number
): { distM: number; nodeIds: number[] } | null {
  const adjacency = new Map<number, [number, number][]>();
  for (const [a, b, d] of graph.edges) {
    (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push([b, d]);
    (adjacency.get(b) ?? adjacency.set(b, []).get(b)!).push([a, d]);
  }

  const dist = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, number>();
  const visited = new Set<number>();

  for (;;) {
    let current = -1;
    let best = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < best) { best = d; current = node; }
    }
    if (current === -1) return null;
    if (current === to) break;
    visited.add(current);
    for (const [next, weight] of adjacency.get(current) ?? []) {
      const candidate = best + weight;
      if (candidate < (dist.get(next) ?? Infinity)) {
        dist.set(next, candidate);
        prev.set(next, current);
      }
    }
  }

  const nodeIds = [to];
  while (nodeIds[0] !== from) nodeIds.unshift(prev.get(nodeIds[0])!);
  return { distM: dist.get(to)!, nodeIds };
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Write the failing route tests** — `src/geo/route.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { nearestNodeId, route, walkMinutes } from './route';
import type { Graph } from '../types';

const graph: Graph = {
  nodes: [
    { id: 0, lat: 28.4082, lon: -16.5659 },
    { id: 1, lat: 28.4082, lon: -16.5649 },
    { id: 2, lat: 28.4090, lon: -16.5649 }
  ],
  edges: [[0, 1, 98], [1, 2, 89]]
};

describe('nearestNodeId', () => {
  test('snaps to the closest node', () => {
    expect(nearestNodeId(graph, 28.4081, -16.5660)).toBe(0);
    expect(nearestNodeId(graph, 28.4091, -16.5650)).toBe(2);
  });
  test('returns null on empty graph', () => {
    expect(nearestNodeId({ nodes: [], edges: [] }, 28, -16)).toBeNull();
  });
});

describe('walkMinutes', () => {
  test('3.5 km/h → 350 m takes 6 minutes', () => {
    expect(walkMinutes(350)).toBeCloseTo(6, 1);
  });
});

describe('route', () => {
  test('routes between coordinates and returns GeoJSON-ready coords', () => {
    const r = route(graph, { lat: 28.4082, lon: -16.5660 }, { lat: 28.4091, lon: -16.5650 });
    expect(r).not.toBeNull();
    expect(r!.distM).toBeCloseTo(187, 0);
    expect(r!.coords[0]).toEqual([-16.5659, 28.4082]);
    expect(r!.coords.at(-1)).toEqual([-16.5649, 28.4090]);
    expect(r!.minutes).toBeGreaterThan(2);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**, then implement `src/geo/route.ts`:

```ts
import { WALK_SPEED_KMH } from '../config';
import type { Graph } from '../types';
import { haversineM } from './distance';
import { shortestPath } from './dijkstra';

export function nearestNodeId(graph: Graph, lat: number, lon: number): number | null {
  let bestId: number | null = null;
  let bestDist = Infinity;
  for (const node of graph.nodes) {
    const d = haversineM(lat, lon, node.lat, node.lon);
    if (d < bestDist) { bestDist = d; bestId = node.id; }
  }
  return bestId;
}

export function walkMinutes(distM: number): number {
  return distM / ((WALK_SPEED_KMH * 1000) / 60);
}

export function route(
  graph: Graph,
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): { distM: number; minutes: number; coords: [number, number][] } | null {
  const fromId = nearestNodeId(graph, from.lat, from.lon);
  const toId = nearestNodeId(graph, to.lat, to.lon);
  if (fromId === null || toId === null) return null;
  const path = shortestPath(graph, fromId, toId);
  if (!path) return null;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const coords = path.nodeIds.map((id) => {
    const n = byId.get(id)!;
    return [n.lon, n.lat] as [number, number];
  });
  return { distM: path.distM, minutes: walkMinutes(path.distM), coords };
}
```

- [ ] **Step 7: Run tests** — `npm test` → PASS.

- [ ] **Step 8: Wire into the map** — in `src/main.ts`: load `graph.json`; replace the temporary popup `onSelect` with routing:

```ts
import { route } from './geo/route';
import { effectivePosition } from './geo/location';
import { PARK_ENTRANCE } from './config';
import type { Graph } from './types';

const graph: Graph = await (await fetch(`${import.meta.env.BASE_URL}data/graph.json`)).json();

function showRouteTo(target: { lat: number; lon: number }): void {
  const origin = effectivePosition(locationState, PARK_ENTRANCE);
  const r = route(graph, origin, target);
  const src = map.getSource('route') as maplibregl.GeoJSONSource;
  if (!r) { src.setData({ type: 'FeatureCollection', features: [] }); return; }
  src.setData({
    type: 'Feature', properties: {},
    geometry: { type: 'LineString', coordinates: r.coords }
  });
  etaChip.textContent = `🚶 ${Math.ceil(r.minutes)} min · ${Math.round(r.distM)} m`;
  etaChip.hidden = false;
}
```
Add a small fixed-position `etaChip` div (`<div id="eta" hidden>` in `index.html`, styled pill: white bg, radius 999px, shadow, top center). POI `onSelect` now calls `showRouteTo(poi)`; map background click clears route + hides chip.

- [ ] **Step 9: Verify** — `npm run dev`: tap a POI → orange route line from your position (or entrance) along paths + ETA pill. Tap empty map → route clears.

- [ ] **Step 10: Commit**

```powershell
git add -A
git commit -m "feat: client-side Dijkstra routing with walking ETA"
```

---

### Task 10: PWA — offline precache + manifest

**Files:**
- Create: `public/icon.svg`
- Modify: `vite.config.ts`, `index.html`, `package.json` (devDeps)

**Interfaces:**
- Produces: installable PWA; all app assets + `park.geojson`/`pois.json`/`graph.json` precached; `data/shows.json` explicitly NOT precached (Task 11 fetches it NetworkFirst with a 4 s network timeout via Workbox runtime caching).

- [ ] **Step 1: Install** — `npm install -D vite-plugin-pwa @vite-pwa/assets-generator`

- [ ] **Step 2: Icon** — `public/icon.svg` (simple: teal rounded square, white compass-parrot mark):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0F766E"/>
  <circle cx="256" cy="236" r="120" fill="none" stroke="#fff" stroke-width="28"/>
  <path d="M256 116 L296 236 L256 356 L216 236 Z" fill="#fff"/>
  <circle cx="256" cy="236" r="26" fill="#E8613C"/>
</svg>
```
Generate PNGs: `npx pwa-assets-generator --preset minimal-2023 public/icon.svg` (outputs `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico` into `public/`).

- [ ] **Step 3: Configure** — in `vite.config.ts`:

```ts
import { VitePWA } from 'vite-plugin-pwa';

// inside defineConfig:
plugins: [
  VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Park Navigator — Unofficial Loro Parque Guide',
      short_name: 'ParkNav',
      description: 'Unofficial offline map and show planner for Loro Parque visitors.',
      theme_color: '#0F766E',
      background_color: '#EFE9DC',
      display: 'standalone',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,geojson,json}'],
      globIgnores: ['**/data/shows.json'],
      runtimeCaching: [{
        urlPattern: /\/data\/shows\.json/,
        handler: 'NetworkFirst',
        options: { cacheName: 'shows', networkTimeoutSeconds: 4 }
      }]
    }
  })
]
```
Add `<meta name="theme-color" content="#0F766E" />` and `<link rel="apple-touch-icon" href="apple-touch-icon-180x180.png" />` to `index.html`.

- [ ] **Step 4: Verify offline** — `npm run build && npm run preview`; open, let it load fully; DevTools → Network → Offline; reload. Expected: map, POIs, and routing all still work.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: PWA manifest and offline precache via service worker"
```

---

### Task 11: Shows — schedule data, loader, "can I make it?"

**Files:**
- Create: `public/data/shows.json`, `src/shows/fallback.json`, `src/shows/schedule.ts`, `src/shows/schedule.test.ts`, `src/shows/canimakeit.ts`, `src/shows/canimakeit.test.ts`

**Interfaces:**
- Consumes: `route(...)` (Task 9), `effectivePosition` (Task 8).
- Produces: `validateShows(data: unknown): ShowsData` (throws on bad shape); `loadShows(url, fetchFn?) -> Promise<{ data: ShowsData; source: 'network' | 'fallback' }>`; `hhmmToMinutes(t: string): number`; `nextTime(times: string[], nowMin: number): string | null`; `activeEntries(data: ShowsData, isoDate: string): ShowEntry[]`; `assess(showStartMin, nowMin, walkMin): 'easy' | 'rush' | 'missed'`; constants `SEAT_BUFFER_MIN = 5`, `JOG_TIME_FACTOR = 0.6`. Task 12 builds the panel UI on exactly these.

- [ ] **Step 1: Seed data** — `public/data/shows.json` (times from the 8/2026 paper schedule; venue coords approximate — flagged for on-site verification in the spec's phase 6):

```json
{
  "updated": "2026-08-13",
  "timezone": "Atlantic/Canary",
  "venues": [
    { "id": "orca-ocean", "name": { "en": "Orca Ocean", "es": "Orca Ocean", "de": "Orca Ocean" }, "lat": 28.4079, "lon": -16.5689 },
    { "id": "dolphinarium", "name": { "en": "Dolphin Show", "es": "Delfinario", "de": "Delfinshow" }, "lat": 28.4066, "lon": -16.5665 },
    { "id": "sea-lions", "name": { "en": "Sea Lion Show", "es": "Leones marinos", "de": "Seelöwenshow" }, "lat": 28.4062, "lon": -16.5677 },
    { "id": "parrot-show", "name": { "en": "Parrot Show", "es": "Show de loros", "de": "Papageienshow" }, "lat": 28.4088, "lon": -16.5652 }
  ],
  "shows": [
    { "venueId": "orca-ocean", "times": ["12:00", "15:45"] },
    { "venueId": "dolphinarium", "times": ["11:00", "14:30"] },
    { "venueId": "sea-lions", "times": ["10:15", "13:15", "16:30"] },
    { "venueId": "parrot-show", "times": ["10:45", "12:45", "14:45", "16:45"] }
  ]
}
```
Copy the same content to `src/shows/fallback.json` (bundled last-resort fallback; keep both in sync when editing times). Add `"resolveJsonModule": true` to `tsconfig.json` `compilerOptions` — `schedule.ts` imports this JSON.

- [ ] **Step 2: Write the failing logic tests** — `src/shows/canimakeit.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { assess, hhmmToMinutes, nextTime } from './canimakeit';
import { activeEntries } from './schedule';
import type { ShowsData } from '../types';

describe('hhmmToMinutes', () => {
  test('parses HH:MM', () => {
    expect(hhmmToMinutes('00:00')).toBe(0);
    expect(hhmmToMinutes('15:45')).toBe(945);
  });
});

describe('nextTime', () => {
  const times = ['10:15', '13:15', '16:30'];
  test('picks the first time at or after now', () => {
    expect(nextTime(times, hhmmToMinutes('09:00'))).toBe('10:15');
    expect(nextTime(times, hhmmToMinutes('13:15'))).toBe('13:15');
    expect(nextTime(times, hhmmToMinutes('14:00'))).toBe('16:30');
  });
  test('returns null after the last show', () => {
    expect(nextTime(times, hhmmToMinutes('17:00'))).toBeNull();
  });
});

describe('assess', () => {
  const now = hhmmToMinutes('12:00');
  test('easy: walk + 5 min seat buffer fits', () => {
    expect(assess(hhmmToMinutes('12:20'), now, 10)).toBe('easy');
  });
  test('rush: only doable at jogging pace (60% of walk time)', () => {
    expect(assess(hhmmToMinutes('12:10'), now, 12)).toBe('rush');
  });
  test('missed: not even jogging helps', () => {
    expect(assess(hhmmToMinutes('12:05'), now, 20)).toBe('missed');
  });
  test('missed: show already started', () => {
    expect(assess(hhmmToMinutes('11:55'), now, 1)).toBe('missed');
  });
});

describe('activeEntries', () => {
  const data: ShowsData = {
    updated: '2026-08-13', timezone: 'Atlantic/Canary', venues: [],
    shows: [
      { venueId: 'a', times: ['10:00'] },
      { venueId: 'b', times: ['11:00'], validFrom: '2026-06-01', validTo: '2026-09-30' },
      { venueId: 'c', times: ['12:00'], validFrom: '2026-11-01' }
    ]
  };
  test('keeps undated and in-range entries, drops out-of-range', () => {
    const ids = activeEntries(data, '2026-08-13').map((e) => e.venueId);
    expect(ids).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail** — `npm test` → FAIL.

- [ ] **Step 4: Implement** — `src/shows/canimakeit.ts`:

```ts
export type ShowStatus = 'easy' | 'rush' | 'missed';

export const SEAT_BUFFER_MIN = 5;
/** Jogging covers the same route in ~60 % of the walking time. */
export const JOG_TIME_FACTOR = 0.6;

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function nextTime(times: string[], nowMin: number): string | null {
  return times.find((t) => hhmmToMinutes(t) >= nowMin) ?? null;
}

export function assess(showStartMin: number, nowMin: number, walkMin: number): ShowStatus {
  const available = showStartMin - nowMin;
  if (available < 0) return 'missed';
  if (walkMin + SEAT_BUFFER_MIN <= available) return 'easy';
  if (walkMin * JOG_TIME_FACTOR <= available) return 'rush';
  return 'missed';
}
```

`src/shows/schedule.ts`:

```ts
import type { ShowEntry, ShowsData } from '../types';
import fallback from './fallback.json';

export function validateShows(data: unknown): ShowsData {
  const d = data as ShowsData;
  if (!d || typeof d.updated !== 'string' || !Array.isArray(d.venues) || !Array.isArray(d.shows)) {
    throw new Error('shows.json: missing updated/venues/shows');
  }
  for (const v of d.venues) {
    if (!v.id || !v.name?.en || typeof v.lat !== 'number' || typeof v.lon !== 'number') {
      throw new Error(`shows.json: bad venue ${JSON.stringify(v)}`);
    }
  }
  const venueIds = new Set(d.venues.map((v) => v.id));
  for (const s of d.shows) {
    if (!venueIds.has(s.venueId)) throw new Error(`shows.json: unknown venueId ${s.venueId}`);
    if (!Array.isArray(s.times) || s.times.some((t) => !/^\d{2}:\d{2}$/.test(t))) {
      throw new Error(`shows.json: bad times for ${s.venueId}`);
    }
  }
  return d;
}

export async function loadShows(
  url: string,
  fetchFn: typeof fetch = fetch
): Promise<{ data: ShowsData; source: 'network' | 'fallback' }> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: validateShows(await res.json()), source: 'network' };
  } catch {
    return { data: validateShows(fallback), source: 'fallback' };
  }
}

export function activeEntries(data: ShowsData, isoDate: string): ShowEntry[] {
  return data.shows.filter((s) =>
    (!s.validFrom || s.validFrom <= isoDate) && (!s.validTo || isoDate <= s.validTo)
  );
}
```

- [ ] **Step 5: Write loader tests** — `src/shows/schedule.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { loadShows, validateShows } from './schedule';

const good = {
  updated: '2026-08-13', timezone: 'Atlantic/Canary',
  venues: [{ id: 'v1', name: { en: 'V1' }, lat: 1, lon: 2 }],
  shows: [{ venueId: 'v1', times: ['10:00'] }]
};

describe('validateShows', () => {
  test('accepts valid data', () => {
    expect(validateShows(good).venues).toHaveLength(1);
  });
  test('rejects unknown venueId and malformed times', () => {
    expect(() => validateShows({ ...good, shows: [{ venueId: 'ghost', times: ['10:00'] }] })).toThrow(/unknown venueId/);
    expect(() => validateShows({ ...good, shows: [{ venueId: 'v1', times: ['10am'] }] })).toThrow(/bad times/);
  });
});

describe('loadShows', () => {
  test('uses network data when fetch succeeds', async () => {
    const fetchFn = (async () => new Response(JSON.stringify(good))) as typeof fetch;
    const r = await loadShows('x', fetchFn);
    expect(r.source).toBe('network');
    expect(r.data.venues[0]?.id).toBe('v1');
  });
  test('falls back to bundled data when fetch fails or payload is invalid', async () => {
    const failing = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect((await loadShows('x', failing)).source).toBe('fallback');
    const badPayload = (async () => new Response('{}')) as typeof fetch;
    expect((await loadShows('x', badPayload)).source).toBe('fallback');
  });
});
```

- [ ] **Step 6: Run all tests** — `npm test` → PASS.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: show schedule loading, validation and can-I-make-it logic"
```

---

### Task 12: Shows panel UI + i18n

**Files:**
- Create: `src/i18n/i18n.ts`, `src/i18n/i18n.test.ts`, `src/i18n/dict/en.json`, `src/i18n/dict/es.json`, `src/i18n/dict/de.json`, `src/ui/showsPanel.ts`
- Modify: `src/main.ts`, `index.html`, `src/styles/app.css`

**Interfaces:**
- Consumes: everything from Tasks 8–11.
- Produces: `detectLang(navigatorLang: string): Lang`; `makeT(lang: Lang): (key: string) => string`; `renderShowsPanel(deps): void` where `deps = { container: HTMLElement; data: ShowsData; graph: Graph; origin: () => {lat;lon}; now: () => Date; t: (k: string) => string; lang: Lang; onVenueSelect: (venue: Venue) => void }`. `now`/`origin` injected for testability and live refresh (panel re-renders every 30 s via `setInterval`).

- [ ] **Step 1: Write the failing i18n tests** — `src/i18n/i18n.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { detectLang, makeT } from './i18n';

describe('detectLang', () => {
  test('maps browser languages to supported set, defaulting to en', () => {
    expect(detectLang('es-ES')).toBe('es');
    expect(detectLang('de')).toBe('de');
    expect(detectLang('cs-CZ')).toBe('en');
  });
});

describe('makeT', () => {
  test('translates known keys and falls back to en, then to the key itself', () => {
    const t = makeT('de');
    expect(t('shows.title')).not.toBe('shows.title');   // exists in de
    expect(makeT('es')('nonexistent.key')).toBe('nonexistent.key');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**, then implement `src/i18n/i18n.ts`:

```ts
import type { Lang } from '../types';
import en from './dict/en.json';
import es from './dict/es.json';
import de from './dict/de.json';

const DICTS: Record<Lang, Record<string, string>> = { en, es, de };

export function detectLang(navigatorLang: string): Lang {
  const code = navigatorLang.slice(0, 2).toLowerCase();
  return code === 'es' || code === 'de' ? code : 'en';
}

export function makeT(lang: Lang): (key: string) => string {
  return (key) => DICTS[lang][key] ?? DICTS.en[key] ?? key;
}
```

Dictionaries (full starting set — extend as UI strings appear):

`src/i18n/dict/en.json`:
```json
{
  "app.title": "Park Navigator",
  "app.subtitle": "Unofficial Loro Parque visitor guide",
  "shows.title": "Today's shows",
  "shows.easy": "You'll make it",
  "shows.rush": "Hurry up!",
  "shows.missed": "Too late",
  "shows.done": "No more shows today",
  "shows.updated": "Schedule updated",
  "shows.offlineNote": "Offline — showing last known schedule",
  "route.walk": "walk",
  "disclaimer.text": "Unofficial app. Not affiliated with Loro Parque. Show times may change — check the official schedule at the entrance. Map data is community-maintained (OpenStreetMap) and still being verified on site — treat locations as beta."
}
```
`src/i18n/dict/es.json`:
```json
{
  "app.title": "Park Navigator",
  "app.subtitle": "Guía no oficial para visitantes de Loro Parque",
  "shows.title": "Espectáculos de hoy",
  "shows.easy": "Llegas bien",
  "shows.rush": "¡Date prisa!",
  "shows.missed": "Demasiado tarde",
  "shows.done": "No hay más espectáculos hoy",
  "shows.updated": "Horario actualizado",
  "shows.offlineNote": "Sin conexión — último horario conocido",
  "route.walk": "a pie",
  "disclaimer.text": "Aplicación no oficial. Sin afiliación con Loro Parque. Los horarios pueden cambiar — consulta el horario oficial en la entrada. Los datos del mapa proceden de OpenStreetMap y aún se están verificando sobre el terreno — considera las ubicaciones como beta."
}
```
`src/i18n/dict/de.json`:
```json
{
  "app.title": "Park Navigator",
  "app.subtitle": "Inoffizieller Besucherführer für den Loro Parque",
  "shows.title": "Heutige Shows",
  "shows.easy": "Du schaffst es",
  "shows.rush": "Beeil dich!",
  "shows.missed": "Zu spät",
  "shows.done": "Keine weiteren Shows heute",
  "shows.updated": "Zeitplan aktualisiert",
  "shows.offlineNote": "Offline — letzter bekannter Zeitplan",
  "route.walk": "zu Fuß",
  "disclaimer.text": "Inoffizielle App. Nicht mit Loro Parque verbunden. Showzeiten können sich ändern — offiziellen Plan am Eingang prüfen. Kartendaten stammen aus OpenStreetMap und werden noch vor Ort geprüft — Standorte gelten als Beta."
}
```
(JSON imports already enabled in Task 11 via `resolveJsonModule`.)

- [ ] **Step 3: Run tests** — `npm test` → PASS.

- [ ] **Step 4: Build the panel** — `src/ui/showsPanel.ts`:

```ts
import { assess, hhmmToMinutes, nextTime, type ShowStatus } from '../shows/canimakeit';
import { activeEntries } from '../shows/schedule';
import { route } from '../geo/route';
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

const STATUS_KEY: Record<ShowStatus, string> = {
  easy: 'shows.easy', rush: 'shows.rush', missed: 'shows.missed'
};

export function renderShowsPanel(deps: ShowsPanelDeps): void {
  const { container, data, graph, origin, now, t, lang, onVenueSelect } = deps;
  const current = now();
  const nowMin = current.getHours() * 60 + current.getMinutes();
  const isoDate = current.toISOString().slice(0, 10);
  const venueById = new Map(data.venues.map((v) => [v.id, v]));

  const rows = activeEntries(data, isoDate).flatMap((entry) => {
    const venue = venueById.get(entry.venueId);
    if (!venue) return [];
    const next = nextTime(entry.times, nowMin);
    if (!next) return [];
    const r = route(graph, origin(), venue);
    const walkMin = r ? Math.ceil(r.minutes) : 0;
    const status = assess(hhmmToMinutes(next), nowMin, walkMin);
    return [{ venue, next, walkMin, status }];
  }).sort((a, b) => hhmmToMinutes(a.next) - hhmmToMinutes(b.next));

  container.replaceChildren(
    el('h2', 'shows-title', t('shows.title')),
    ...(rows.length === 0 ? [el('p', 'shows-empty', t('shows.done'))] : rows.map((row) => {
      const item = document.createElement('button');
      item.className = `show-row show-row--${row.status}`;
      item.append(
        el('span', 'show-time', row.next),
        el('span', 'show-name', localName(row.venue.name, lang)),
        el('span', 'show-walk', `🚶 ${row.walkMin} min`),
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
```

- [ ] **Step 5: Wire in `src/main.ts`** — load shows via `loadShows(import.meta.env.BASE_URL + 'data/shows.json')`; bottom sheet `<section id="shows-panel">` in `index.html`; re-render every 30 s (`setInterval`) and on location change; `onVenueSelect` → `showRouteTo(venue)`. Show `shows.offlineNote` line when `source === 'fallback'`. Replace remaining hardcoded UI strings (title, subtitle) with `t(...)`. Language: `detectLang(navigator.language)` + three-button switcher (EN/ES/DE) in the header that re-renders panel and marker labels.

Panel CSS (bottom sheet, status colors from tokens):

```css
#shows-panel {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 10;
  background: #fff; border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel); padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  max-height: 45vh; overflow-y: auto;
}
.show-row {
  display: grid; grid-template-columns: 3.5rem 1fr auto auto; gap: 8px;
  align-items: center; width: 100%; padding: 10px 8px; border: none;
  background: none; border-left: 4px solid transparent; text-align: left;
  font-size: 0.95rem; cursor: pointer;
}
.show-row--easy { border-left-color: var(--color-easy); }
.show-row--rush { border-left-color: var(--color-rush); }
.show-row--missed { border-left-color: var(--color-missed); opacity: 0.55; }
.show-status--easy { color: var(--color-easy); font-weight: 600; }
.show-status--rush { color: var(--color-rush); font-weight: 600; }
.show-status--missed { color: var(--color-missed); }
.show-time { font-variant-numeric: tabular-nums; font-weight: 700; }
```

- [ ] **Step 6: Verify** — `npm run dev`: panel lists today's shows sorted by time with green/amber/red statuses; tapping a row draws the route to the venue; switching language re-labels everything. `npm test` still green.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: shows panel with can-I-make-it status and EN/ES/DE i18n"
```

---

### Task 13: Disclaimer + about screen

**Files:**
- Create: `src/ui/about.ts`
- Modify: `src/main.ts`, `index.html`, `src/styles/app.css`, dictionaries (keys already exist: `disclaimer.text`, `app.title`, `app.subtitle`)

**Interfaces:**
- Produces: header bar with app title + ⓘ button; modal with subtitle, disclaimer text, data attribution ("Map data © OpenStreetMap contributors"), schedule `updated` date, and app version.

- [ ] **Step 1: Implement** — `src/ui/about.ts`:

```ts
export interface AboutDeps {
  t: (key: string) => string;
  updated: string;
  version: string;
}

export function createAboutDialog(deps: AboutDeps): HTMLDialogElement {
  const { t, updated, version } = deps;
  const dialog = document.createElement('dialog');
  dialog.className = 'about';
  dialog.innerHTML = `
    <h2>${t('app.title')}</h2>
    <p class="about-subtitle">${t('app.subtitle')}</p>
    <p class="about-disclaimer">${t('disclaimer.text')}</p>
    <p class="about-meta">${t('shows.updated')}: ${updated}</p>
    <p class="about-meta">Map data © OpenStreetMap contributors · v${version}</p>
    <form method="dialog"><button class="about-close">OK</button></form>
  `;
  document.body.append(dialog);
  return dialog;
}
```
(Static trusted strings only — no user input reaches this `innerHTML`.)

In `index.html` add `<header id="topbar"></header>`; in `src/main.ts`:

```ts
import pkg from '../package.json';
import { createAboutDialog } from './ui/about';

const about = createAboutDialog({ t, updated: showsData.updated, version: pkg.version });
const infoBtn = document.createElement('button');
infoBtn.className = 'topbar-info';
infoBtn.textContent = 'ⓘ';
infoBtn.addEventListener('click', () => about.showModal());
document.getElementById('topbar')!.append(titleEl, langSwitcher, infoBtn);
```
(`titleEl` = `<span>` with `t('app.title')`; `langSwitcher` from Task 12.) Style: topbar floating pill (top center, white, shadow), dialog max-width 28rem, `dialog::backdrop { background: rgb(0 0 0 / .4); }`.

- [ ] **Step 2: First-launch notice** — on first run (`localStorage['lpn.seen-disclaimer']` unset), open the about dialog automatically and set the flag on close. This is the legally relevant part: the user sees "unofficial, times may change" once.

- [ ] **Step 3: Verify** — dev server: ⓘ opens dialog in all three languages; first load in a private window auto-opens it.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: about dialog with unofficial-app disclaimer and OSM attribution"
```

---

### Task 14: E2E smoke tests (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: built app via `npm run preview`.

- [ ] **Step 1: Install** — `npm install -D @playwright/test` then `npx playwright install chromium`

- [ ] **Step 2: Config** — `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173/loro-parque-navigator/' },
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI
  }
});
```

- [ ] **Step 3: Tests** — `e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('app shell loads with map canvas and shows panel', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#shows-panel')).toBeVisible();
  await expect(page.locator('#topbar')).toContainText('Park Navigator');
});

test('works offline after first visit (service worker)', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await page.evaluate(async () => { await navigator.serviceWorker?.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#shows-panel')).toBeVisible();
  await context.setOffline(false);
});
```

- [ ] **Step 4: Run** — `npm run build && npm run e2e` → both tests PASS. (Service worker needs the production build; e2e always runs against `preview`.)

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "test: Playwright smoke tests incl. offline reload"
```

---

### Task 15: GitHub repo, Pages deploy, README

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`, `LICENSE`

**Interfaces:**
- Produces: public GitHub repo `loro-parque-navigator`, CI (test + build + e2e) and Pages deployment on every push to `master`. Live URL `https://<account>.github.io/loro-parque-navigator/`.

- [ ] **Step 1: Workflow** — `.github/workflows/deploy.yml`:

```yaml
name: deploy
on:
  push:
    branches: [master]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README** — `README.md` in English, covering: what it is (unofficial guide, disclaimer), live URL, screenshots placeholder, dev commands (`npm run dev/test/e2e/build`), data pipeline (`npm run data:fetch && npm run data:build`, overrides.json workflow), **how to update show times** (edit `public/data/shows.json` + `src/shows/fallback.json`, commit, push — Pages redeploys automatically; this section is the future-maintenance manual), OSM attribution, MIT license note.

- [ ] **Step 3: LICENSE** — MIT, copyright Martin Nimrichter.

- [ ] **Step 4: Create repo + push** (requires `gh` auth; STOP and ask the user if `gh auth status` fails):

```powershell
gh repo create loro-parque-navigator --public --source . --push
```
Then enable Pages: `gh api repos/{owner}/loro-parque-navigator/pages -X POST -f build_type=workflow` (or via repo Settings → Pages → Source: GitHub Actions if the API call 409s on an existing config).

- [ ] **Step 5: Verify deployment** — push triggers the workflow; `gh run watch`; open the live URL, confirm the app loads and installs as PWA on a phone.

- [ ] **Step 6: Commit any leftovers and update project memory** — update `OneDrive\Work\projectsmemory\Osobni\loro_parque_navigator.md` status line: deployed, live URL, next step = on-site POI verification (spec phase 6).

```powershell
git add -A
git commit -m "docs: README, MIT license and Pages deploy workflow"
git push
```

---

## Verification (whole-plan)

- `npm test` — all unit tests green, coverage ≥ 80 % on `src/geo`, `src/shows`, `src/i18n`, `scripts/lib`.
- `npm run build && npm run e2e` — smoke + offline tests green.
- Manual on phone: install PWA from live URL, airplane mode, map + routing + shows panel still work.
- Spec cross-check: every spec section (map, offline, routing, shows, i18n, branding/disclaimer, hosting, data pipeline incl. overrides) has a shipped counterpart; phase 6 (on-site POI verification) is deliberately out of code scope.
