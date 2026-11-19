"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { CURRENCY_COOKIE, LOCALE_COOKIE, localeNames, locales, type Locale } from "@/lib/i18n/config";

const selectClass =
  "h-8 cursor-pointer appearance-none rounded-full border border-line bg-black px-3 text-xs text-white transition-colors hover:border-white focus:border-white focus:outline-none";

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      aria-label={label}
      className={selectClass}
      value={locale}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Locale;
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        const parts = pathname.split("/");
        parts[1] = next;
        const query = typeof window !== "undefined" ? window.location.search : "";
        start(() => router.push(parts.join("/") + query));
      }}
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}

export function CurrencySwitcher({ value, currencies, label }: { value: string; currencies: string[]; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (currencies.length < 2) return null;
  return (
    <select
      aria-label={label}
      className={selectClass}
      value={value}
      disabled={pending}
      onChange={(e) => {
        document.cookie = `${CURRENCY_COOKIE}=${e.target.value}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
    >
      {currencies.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
