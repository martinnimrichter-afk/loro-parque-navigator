import { describe, expect, test } from 'vitest';
import { iconFor, labelKind, localName } from './markers';

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

describe('labelKind', () => {
  test('show venues are always labelled', () => {
    expect(labelKind({ id: 'node/6442111293', category: 'show', name: { en: 'Orca Show' } })).toBe('always');
    expect(labelKind({ id: 'node/2652526870', category: 'animal', name: { en: 'Orca Ocean Show' } })).toBe('always');
    expect(labelKind({ id: 'node/3940354788', category: 'animal', name: { en: 'Dolphins' } })).toBe('always');
  });

  test('named POIs get a zoom-gated label', () => {
    expect(labelKind({ id: 'node/347312075', category: 'animal', name: { en: 'Gorillas' } })).toBe('zoom');
    expect(labelKind({ id: 'way/389436478', category: 'food', name: { en: 'Casa Pepe' } })).toBe('zoom');
  });

  test('placeholder-named POIs stay icon-only', () => {
    expect(labelKind({ id: 'node/2652526872', category: 'toilets', name: { en: 'toilets' } })).toBe(null);
    expect(labelKind({ id: 'node/5792885913', category: 'info', name: { en: 'Mapa' } })).toBe(null);
    expect(labelKind({ id: 'node/2769228037', category: 'entrance', name: { en: 'entrance' } })).toBe(null);
  });
});
