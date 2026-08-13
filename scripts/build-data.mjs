import { mkdir, readFile, writeFile } from 'node:fs/promises';
import osmtogeojson from 'osmtogeojson';
import { buildPois } from './lib/poi.mjs';
import { applyOverrides } from './lib/overrides.mjs';
import { buildGraph } from './lib/graph.mjs';

const raw = JSON.parse(await readFile('data/raw/overpass.json', 'utf8'));
const geojson = osmtogeojson(raw);
const pois = buildPois(geojson.features);
const overrides = JSON.parse(await readFile('data/overrides.json', 'utf8'));
const finalPois = applyOverrides(pois, overrides);
const graph = buildGraph(geojson.features);

await mkdir('public/data', { recursive: true });
await writeFile('public/data/park.geojson', JSON.stringify(geojson));
await writeFile('public/data/pois.json', JSON.stringify(finalPois, null, 2));
await writeFile('public/data/graph.json', JSON.stringify(graph));
console.log(`park.geojson: ${geojson.features.length} features, pois.json: ${finalPois.length} POIs`);
console.log(`graph.json: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
