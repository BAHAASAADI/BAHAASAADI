import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createPublicClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CURRENCY_COOKIE, type Locale } from "@/lib/i18n/config";
import { rateTable, type RateTable } from "@/lib/currency";
import type {
  BatteryBand,
  ContentPage,
  Currency,
  DeviceCondition,
  Faq,
  IphoneModel,
  ProductWithRelations,
  Review,
  Shop,
  SiteSettings,
} from "@/lib/types";

export const PRODUCT_SELECT =
  "*, model:iphone_models(id,name,slug,sort_order,display_inches,chip,biometrics,connector,has_5g), shop:shops(id,name,city,whatsapp,phone,currency,maps_url), photos:product_photos(id,product_id,path,sort_order)";

function sortPhotos<T extends { photos: { sort_order: number }[] }>(rows: T[]): T[] {
  for (const r of rows) r.photos?.sort((a, b) => a.sort_order - b.sort_order);
  return rows;
}

export interface SiteContext {
  configured: boolean;
  settings: SiteSettings | null;
  shops: Shop[];
  currencies: Currency[];
  rates: RateTable;
  primaryShop: Shop | null;
  displayCurrency: string;
  whatsappNumber: string | null;
}

/** Settings, shops and currencies shared by every public page (one query set per request). */
export const getSiteContext = cache(async (): Promise<SiteContext> => {
  if (!isSupabaseConfigured) {
    return { configured: false, settings: null, shops: [], currencies: [], rates: {}, primaryShop: null, displayCurrency: "EUR", whatsappNumber: null };
  }
  const supabase = createPublicClient();
  const [settingsRes, shopsRes, currenciesRes] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("shops").select("*").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("currencies").select("*").eq("is_active", true).order("code"),
  ]);
  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (shopsRes.error) throw new Error(shopsRes.error.message);
  if (currenciesRes.error) throw new Error(currenciesRes.error.message);

  const settings = settingsRes.data as SiteSettings | null;
  const shops = (shopsRes.data ?? []) as Shop[];
  const currencies = (currenciesRes.data ?? []) as Currency[];
  const primaryShop = shops.find((s) => s.id === settings?.primary_shop_id) ?? shops[0] ?? null;

  const cookieStore = await cookies();
  const wanted = cookieStore.get(CURRENCY_COOKIE)?.value;
  const mainCurrency = settings?.main_currency ?? currencies[0]?.code ?? "EUR";
  const displayCurrency = wanted && currencies.some((c) => c.code === wanted) ? wanted : mainCurrency;

  return {
    configured: true,
    settings,
    shops,
    currencies,
    rates: rateTable(currencies),
    primaryShop,
    displayCurrency,
    whatsappNumber: settings?.whatsapp_number || primaryShop?.whatsapp || null,
  };
});

export const getModels = cache(async (): Promise<IphoneModel[]> => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("iphone_models")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as IphoneModel[];
});

export interface CatalogueFilters {
  model?: string;
  storage?: number;
  color?: string;
  condition?: DeviceCondition;
  shop?: string;
  battery?: number;
  includeReserved?: boolean;
  featured?: boolean;
  q?: string;
}

/** Products visible to customers (row level security already hides sold/unpublished phones). */
export async function getProducts(filters: CatalogueFilters = {}, limit = 500): Promise<ProductWithRelations[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  let query = supabase.from("products").select(PRODUCT_SELECT).neq("status", "sold");

  if (filters.model) {
    const models = await getModels();
    const model = models.find((m) => m.slug === filters.model);
    if (!model) return [];
    query = query.eq("model_id", model.id);
  }
  if (filters.storage) query = query.eq("storage_gb", filters.storage);
  if (filters.color) query = query.ilike("color", filters.color);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.shop) query = query.eq("shop_id", filters.shop);
  if (filters.battery) query = query.gte("battery_health", filters.battery);
  if (!filters.includeReserved) query = query.eq("status", "available");
  if (filters.featured) query = query.eq("is_featured", true);

  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  let rows = sortPhotos((data ?? []) as unknown as ProductWithRelations[]);

  if (filters.q) {
    const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    rows = rows.filter((p) => {
      const haystack = [p.inventory_id, p.model?.name, p.color, `${p.storage_gb}gb`, p.storage_gb >= 1024 ? `${p.storage_gb / 1024}tb` : ""]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }
  return rows;
}

export async function getProduct(inventoryId: string): Promise<ProductWithRelations | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await createPublicClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("inventory_id", inventoryId.toUpperCase())
    .neq("status", "sold")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return sortPhotos([data as unknown as ProductWithRelations])[0];
}

/** Every phone a customer can see (available + reserved), loaded once per request. */
export const getVisibleProducts = cache(() => getProducts({ includeReserved: true }));

export async function getStockSummary(): Promise<{ model: IphoneModel; count: number }[]> {
  const [products, models] = await Promise.all([getVisibleProducts(), getModels()]);
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.model_id, (counts.get(p.model_id) ?? 0) + 1);
  return models.filter((m) => counts.has(m.id)).map((m) => ({ model: m, count: counts.get(m.id)! }));
}

export async function getShopStockCounts(): Promise<Record<string, number>> {
  const products = await getVisibleProducts();
  const counts: Record<string, number> = {};
  for (const p of products) counts[p.shop_id] = (counts[p.shop_id] ?? 0) + 1;
  return counts;
}

export async function getReviews(): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("reviews")
    .select("*")
    .eq("is_published", true)
    .order("sort_order")
    .order("review_date", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);
  return (data ?? []) as Review[];
}

export async function getFaqs(locale: Locale): Promise<Faq[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("faqs").select("*").eq("is_published", true).eq("locale", locale).order("sort_order");
  if (error) throw new Error(error.message);
  if (data && data.length) return data as Faq[];
  if (locale === "en") return [];
  const fallback = await supabase.from("faqs").select("*").eq("is_published", true).eq("locale", "en").order("sort_order");
  return (fallback.data ?? []) as Faq[];
}

export async function getPage(slug: ContentPage["slug"], locale: Locale): Promise<ContentPage | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await createPublicClient().from("pages").select("*").eq("slug", slug).in("locale", [locale, "en"]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ContentPage[];
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "en") ?? null;
}

export interface SellContext {
  models: IphoneModel[];
  bestPrices: Record<string, number>;
  bands: BatteryBand[];
}

export async function getSellContext(): Promise<SellContext> {
  if (!isSupabaseConfigured) return { models: [], bestPrices: {}, bands: [] };
  const supabase = createPublicClient();
  const [models, pricesRes, bandsRes] = await Promise.all([
    getModels(),
    supabase.from("buy_prices").select("model_id, base_price").eq("is_active", true),
    supabase.from("battery_bands").select("*").order("min_pct", { ascending: false }),
  ]);
  if (pricesRes.error) throw new Error(pricesRes.error.message);
  if (bandsRes.error) throw new Error(bandsRes.error.message);
  const bestPrices: Record<string, number> = {};
  for (const row of pricesRes.data ?? []) {
    bestPrices[row.model_id] = Math.max(bestPrices[row.model_id] ?? 0, Number(row.base_price));
  }
  return { models, bestPrices, bands: (bandsRes.data ?? []) as BatteryBand[] };
}
