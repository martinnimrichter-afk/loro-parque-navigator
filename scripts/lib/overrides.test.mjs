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
