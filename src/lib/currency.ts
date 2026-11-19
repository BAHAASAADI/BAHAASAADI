import type { Currency } from "./types";

export type RateTable = Record<string, Pick<Currency, "code" | "rate" | "decimals" | "round_to">>;

export function rateTable(currencies: Currency[]): RateTable {
  return Object.fromEntries(currencies.map((c) => [c.code, c]));
}

/** Converts using manual rates: rate = units of a currency per 1 unit of the main currency. */
export function convert(amount: number, from: string, to: string, rates: RateTable): number | null {
  if (from === to) return amount;
  const a = rates[from];
  const b = rates[to];
  if (!a || !b || !a.rate || !b.rate) return null;
  return (amount / Number(a.rate)) * Number(b.rate);
}

export function formatMoney(amount: number, currency: string, locale: string, decimals?: number): string {
  const digits = decimals ?? (Number.isInteger(amount) ? 0 : 2);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(digits)} ${currency}`;
  }
}

/**
 * Formats a price in the visitor's display currency. When the display currency
 * differs from the price currency, the converted value is rounded and marked as
 * approximate.
 */
export function displayPrice(
  amount: number,
  priceCurrency: string,
  displayCurrency: string,
  rates: RateTable,
  locale: string,
): { text: string; approximate: boolean; original: string } {
  const original = formatMoney(amount, priceCurrency, locale);
  if (displayCurrency === priceCurrency) return { text: original, approximate: false, original };
  const converted = convert(amount, priceCurrency, displayCurrency, rates);
  if (converted == null) return { text: original, approximate: false, original };
  const step = Number(rates[displayCurrency]?.round_to ?? 1);
  const rounded = Math.round(converted / step) * step;
  return { text: formatMoney(rounded, displayCurrency, locale, 0), approximate: true, original };
}

/** Rounds a converted offer down so an estimate is never overstated. */
export function displayOffer(amount: number, from: string, to: string, rates: RateTable, locale: string): string {
  if (from === to) return formatMoney(amount, from, locale);
  const converted = convert(amount, from, to, rates);
  if (converted == null) return formatMoney(amount, from, locale);
  const step = Number(rates[to]?.round_to ?? 1);
  return formatMoney(Math.floor(converted / step) * step, to, locale, 0);
}
