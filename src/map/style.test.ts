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
