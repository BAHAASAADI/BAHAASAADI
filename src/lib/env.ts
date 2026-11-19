// Public configuration. Only NEXT_PUBLIC_* values reach the browser.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const PRODUCT_PHOTOS_BUCKET = "product-photos";
export const TRADE_IN_PHOTOS_BUCKET = "trade-in-photos";

export function publicPhotoUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_PHOTOS_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
