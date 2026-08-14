import { describe, expect, test } from 'vitest';
import { detectLang, makeT } from './i18n';
import en from './dict/en.json';
import es from './dict/es.json';
import de from './dict/de.json';
import cs from './dict/cs.json';
import pl from './dict/pl.json';
import fr from './dict/fr.json';

describe('detectLang', () => {
  test('maps browser languages to supported set, defaulting to en', () => {
    expect(detectLang('es-ES')).toBe('es');
    expect(detectLang('de')).toBe('de');
    expect(detectLang('cs-CZ')).toBe('cs');
    expect(detectLang('pl-PL')).toBe('pl');
    expect(detectLang('fr')).toBe('fr');
    expect(detectLang('ja-JP')).toBe('en');
  });
});

describe('dictionaries', () => {
  test('every language covers exactly the en key set', () => {
    const enKeys = Object.keys(en).sort();
    for (const dict of [es, de, cs, pl, fr]) {
      expect(Object.keys(dict).sort()).toEqual(enKeys);
    }
  });
});

describe('makeT', () => {
  test('translates known keys and falls back to en, then to the key itself', () => {
    const t = makeT('de');
    expect(t('shows.title')).not.toBe('shows.title');   // exists in de
    expect(makeT('cs')('shows.title')).toBe('Dnešní show');
    expect(makeT('es')('nonexistent.key')).toBe('nonexistent.key');
  });
});
