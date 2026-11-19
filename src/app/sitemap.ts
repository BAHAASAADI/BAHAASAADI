import type { MetadataRoute } from "next";
import { getVisibleProducts } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";
import { locales } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/buy", "/sell", "/shops", "/faq", "/contact", "/privacy", "/terms", "/trade-in-conditions"];
  const entries: MetadataRoute.Sitemap = [];
  for (const path of pages) {
    entries.push({
      url: `${SITE_URL}/en${path}`,
      changeFrequency: path === "/buy" || path === "" ? "daily" : "monthly",
      priority: path === "" ? 1 : path === "/buy" || path === "/sell" ? 0.9 : 0.5,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    });
  }
  const products = await getVisibleProducts().catch(() => []);
  for (const p of products) {
    entries.push({
      url: `${SITE_URL}/en/buy/${p.inventory_id}`,
      lastModified: p.updated_at,
      changeFrequency: "daily",
      priority: 0.7,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}/buy/${p.inventory_id}`])) },
    });
  }
  return entries;
}
