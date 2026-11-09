import type { Text } from '../data/types';

export type Lang = 'en' | 'ro';
export const LANGS: Lang[] = ['en', 'ro'];

/**
 * A screen's strings in both languages. The Romanian half must have exactly the same
 * shape as the English one (TypeScript enforces it), and entries can be functions so
 * numbers and Romanian plural forms come out right.
 */
export function texts<T>(d: { en: T; ro: T }): { en: T; ro: T } {
  return d;
}

export function pick(t: Text, lang: Lang): string {
  return t[lang] || t.en;
}

/** Romanian plural: 1 zi, 2 zile, 20 de zile (numbers ending 00 or 20–99 take "de"). */
export function roPlural(n: number, one: string, few: string): string {
  const abs = Math.abs(Math.round(n));
  if (abs === 1) return `${n} ${one}`;
  const rest = abs % 100;
  return abs !== 0 && (rest === 0 || rest >= 20) ? `${n} de ${few}` : `${n} ${few}`;
}

export function enPlural(n: number, one: string, many: string): string {
  return `${n} ${Math.abs(n) === 1 ? one : many}`;
}

export function detectLang(): Lang {
  try {
    return navigator.language?.toLowerCase().startsWith('ro') ? 'ro' : 'en';
  } catch {
    return 'en';
  }
}
