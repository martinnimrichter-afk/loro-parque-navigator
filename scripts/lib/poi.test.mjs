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
  function feature() {
    return {
      id: 'node/5', properties: { amenity: 'toilets' },
      geometry: { type: 'Point', coordinates: [-16.566, 28.409] }
    };
  }

  test('filters non-POI features and dedupes by id', () => {
    const path = { id: 'way/1', properties: { highway: 'footway' }, geometry: { type: 'LineString', coordinates: [[-16.57, 28.41], [-16.569, 28.41]] } };
    const pois = buildPois([path, feature(), feature()]);
    expect(pois).toHaveLength(1);
  });
});
