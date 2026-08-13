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
