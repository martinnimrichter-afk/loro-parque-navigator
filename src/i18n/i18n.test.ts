import { describe, expect, test } from 'vitest';
import { detectLang, makeT } from './i18n';

describe('detectLang', () => {
  test('maps browser languages to supported set, defaulting to en', () => {
    expect(detectLang('es-ES')).toBe('es');
    expect(detectLang('de')).toBe('de');
    expect(detectLang('cs-CZ')).toBe('en');
  });
});

describe('makeT', () => {
  test('translates known keys and falls back to en, then to the key itself', () => {
    const t = makeT('de');
    expect(t('shows.title')).not.toBe('shows.title');   // exists in de
    expect(makeT('es')('nonexistent.key')).toBe('nonexistent.key');
  });
});
