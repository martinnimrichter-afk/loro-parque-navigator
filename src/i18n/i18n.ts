import type { Lang } from '../types';
import en from './dict/en.json';
import es from './dict/es.json';
import de from './dict/de.json';

const DICTS: Record<Lang, Record<string, string>> = { en, es, de };

export function detectLang(navigatorLang: string): Lang {
  const code = navigatorLang.slice(0, 2).toLowerCase();
  return code === 'es' || code === 'de' ? code : 'en';
}

export function makeT(lang: Lang): (key: string) => string {
  return (key) => DICTS[lang][key] ?? DICTS.en[key] ?? key;
}
