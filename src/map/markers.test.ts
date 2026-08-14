import { describe, expect, test } from 'vitest';
import { hasLabel, iconFor, localName } from './markers';

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
    expect(localName({ en: 'Dolphin Show', cs: 'Delfíní show' }, 'cs')).toBe('Delfíní show');
    expect(localName({ en: 'Dolphin Show' }, 'pl')).toBe('Dolphin Show');
  });
});

describe('hasLabel', () => {
  test('labels show-category POIs and the show venues', () => {
    expect(hasLabel({ id: 'node/6442111293', category: 'show' })).toBe(true);   // Orca Show
    expect(hasLabel({ id: 'node/2652526870', category: 'animal' })).toBe(true); // Orca Ocean Show
    expect(hasLabel({ id: 'node/3940354788', category: 'animal' })).toBe(true); // Dolphins
  });

  test('leaves ordinary POIs unlabelled', () => {
    expect(hasLabel({ id: 'node/347312075', category: 'animal' })).toBe(false); // Gorillas
    expect(hasLabel({ id: 'way/216263944', category: 'food' })).toBe(false);
  });
});
