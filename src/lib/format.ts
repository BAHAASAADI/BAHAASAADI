export function formatStorage(gb: number): string {
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024}TB` : `${gb}GB`;
}

export function formatDate(value: string | Date | null | undefined, locale: string, withTime = false): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

/** Digits only (with country code) for wa.me links. */
export function whatsappDigits(number: string | null | undefined): string | null {
  if (!number) return null;
  let digits = number.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  digits = digits.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

export function whatsappLink(number: string | null | undefined, text: string): string | null {
  const digits = whatsappDigits(number);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function telLink(number: string | null | undefined): string | null {
  if (!number) return null;
  const clean = number.replace(/[^\d+]/g, "");
  return clean.length >= 5 ? `tel:${clean}` : null;
}

export function clampInt(value: unknown, min: number, max: number): number | null {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) return null;
  return Math.min(max, Math.max(min, n));
}
