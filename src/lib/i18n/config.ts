export const locales = ["en", "fr", "ar", "pl"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
  pl: "Polski",
};

/** BCP-47 tags used for number, currency and date formatting. */
export const intlLocale: Record<Locale, string> = {
  en: "en-GB",
  fr: "fr-FR",
  ar: "ar-DZ",
  pl: "pl-PL",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const LOCALE_COOKIE = "izone_locale";
export const CURRENCY_COOKIE = "izone_currency";
