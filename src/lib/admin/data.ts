import "server-only";
import { cache } from "react";
import { getAdminSession } from "@/lib/admin/auth";
import type { Currency, IphoneModel, Shop, SiteSettings } from "@/lib/types";

/** Shops, models, currencies and settings for dashboard pages (all rows, incl. inactive). */
export const getLookups = cache(async () => {
  const { supabase } = await getAdminSession();
  const [shops, models, currencies, settings, admins] = await Promise.all([
    supabase.from("shops").select("*").order("sort_order").order("name"),
    supabase.from("iphone_models").select("*").order("sort_order", { ascending: false }),
    supabase.from("currencies").select("*").order("code"),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("admins").select("user_id,email,full_name"),
  ]);
  const shopList = (shops.data ?? []) as Shop[];
  const modelList = (models.data ?? []) as IphoneModel[];
  return {
    shops: shopList,
    shopById: Object.fromEntries(shopList.map((s) => [s.id, s])) as Record<string, Shop>,
    models: modelList,
    modelById: Object.fromEntries(modelList.map((m) => [m.id, m])) as Record<string, IphoneModel>,
    currencies: (currencies.data ?? []) as Currency[],
    settings: (settings.data ?? null) as SiteSettings | null,
    mainCurrency: (settings.data as SiteSettings | null)?.main_currency ?? "EUR",
    adminNames: Object.fromEntries(((admins.data ?? []) as { user_id: string; email: string; full_name: string | null }[]).map((a) => [a.user_id, a.full_name || a.email])) as Record<string, string>,
  };
});

export function money(amount: number | string | null | undefined, currency: string, decimals?: number): string {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  const digits = decimals ?? (Number.isInteger(n) ? 0 : 2);
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  } catch {
    return `${n.toFixed(digits)} ${currency}`;
  }
}

export function dateTime(value: string | null | undefined, withTime = true): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(new Date(value));
}

export type Period = { from: string | null; to: string | null; label: string; key: string };

/** Period presets used by the overview and reports (dates are interpreted in UTC). */
export function resolvePeriod(key: string | undefined, from?: string, to?: string): Period {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const iso = (d: Date) => d.toISOString();
  switch (key) {
    case "today":
      return { key, label: "Today", from: iso(startOfDay(now)), to: null };
    case "7d":
      return { key, label: "Last 7 days", from: iso(new Date(startOfDay(now).getTime() - 6 * 864e5)), to: null };
    case "30d":
      return { key, label: "Last 30 days", from: iso(new Date(startOfDay(now).getTime() - 29 * 864e5)), to: null };
    case "month":
      return { key, label: "This month", from: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to: null };
    case "year":
      return { key, label: "This year", from: iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), to: null };
    case "custom": {
      const f = from ? new Date(`${from}T00:00:00Z`) : null;
      const t = to ? new Date(new Date(`${to}T00:00:00Z`).getTime() + 864e5) : null;
      return { key, label: "Custom", from: f && !Number.isNaN(f.getTime()) ? iso(f) : null, to: t && !Number.isNaN(t.getTime()) ? iso(t) : null };
    }
    default:
      return { key: "all", label: "All time", from: null, to: null };
  }
}
