import en, { type Dictionary } from "./dictionaries/en";
import fr from "./dictionaries/fr";
import ar from "./dictionaries/ar";
import pl from "./dictionaries/pl";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { en, fr, ar, pl };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

/** Replaces {placeholders} in a translated string. */
export function t(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => (key in values ? String(values[key]) : `{${key}}`));
}

export type { Dictionary };
export * from "./config";
