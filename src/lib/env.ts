// Public configuration. Only NEXT_PUBLIC_* values reach the browser.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const PRODUCT_PHOTOS_BUCKET = "product-photos";
export const TRADE_IN_PHOTOS_BUCKET = "trade-in-photos";

/**
 * Local preview only: when NEXT_PUBLIC_SUPABASE_VIA_SITE=true, the browser reaches
 * Supabase through this website at /supabase (see the rewrite in next.config.ts),
 * so a preview opened from another machine needs only one address. Off in production.
 */
export const SUPABASE_VIA_SITE = process.env.NEXT_PUBLIC_SUPABASE_VIA_SITE === "true";
export const SUPABASE_SITE_PATH = "/supabase";

/** Supabase address for code running in the browser. */
export function browserSupabaseUrl(): string {
  return SUPABASE_VIA_SITE && typeof window !== "undefined" ? `${window.location.origin}${SUPABASE_SITE_PATH}` : SUPABASE_URL;
}

/** Turns a Supabase URL (e.g. a signed photo link) into one the visitor's browser can open. */
export function toBrowserUrl(url: string): string {
  return SUPABASE_VIA_SITE && url.startsWith(SUPABASE_URL) ? SUPABASE_SITE_PATH + url.slice(SUPABASE_URL.length) : url;
}

/** Same session cookie name for server and browser clients, even when their addresses differ. */
export const AUTH_COOKIE_NAME = (() => {
  try {
    return `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  } catch {
    return undefined;
  }
})();

export function publicPhotoUrl(path: string): string {
  const base = SUPABASE_VIA_SITE ? SUPABASE_SITE_PATH : SUPABASE_URL;
  return `${base}/storage/v1/object/public/${PRODUCT_PHOTOS_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
