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
