import { mkdir, readFile, writeFile } from 'node:fs/promises';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const query = await readFile(new URL('./overpass.ql', import.meta.url), 'utf8');
const res = await fetch(OVERPASS_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'LoroParqueNavigator/0.1.0'
  },
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
