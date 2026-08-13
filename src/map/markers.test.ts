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
