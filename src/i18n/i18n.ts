import type { Lang } from '../types';
import en from './dict/en.json';
import es from './dict/es.json';
import de from './dict/de.json';
import cs from './dict/cs.json';
import pl from './dict/pl.json';
import fr from './dict/fr.json';

const DICTS: Record<Lang, Record<string, string>> = { en, es, de, cs, pl, fr };

const NON_DEFAULT_LANGS = new Set(['es', 'de', 'cs', 'pl', 'fr']);

export function detectLang(navigatorLang: string): Lang {
  const code = navigatorLang.slice(0, 2).toLowerCase();
  return NON_DEFAULT_LANGS.has(code) ? (code as Lang) : 'en';
}

export function makeT(lang: Lang): (key: string) => string {
  return (key) => DICTS[lang][key] ?? DICTS.en[key] ?? key;
}
