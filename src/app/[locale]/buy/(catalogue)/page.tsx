import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { AutoSubmitSelect } from "@/components/site/auto-submit-select";
import { ProductCard, ProductGrid } from "@/components/site/product-card";
import { buttonClass, Field, Input, Select } from "@/components/ui";
import { convert } from "@/lib/currency";
import { getModels, getSiteContext, getVisibleProducts } from "@/lib/data/public";
import { formatStorage } from "@/lib/format";
import { getDictionary, isLocale, t } from "@/lib/i18n";
import { CONDITIONS, type DeviceCondition, type ProductWithRelations } from "@/lib/types";

const PAGE_SIZE = 24;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.catalogue.title, description: dict.catalogue.lead, alternates: { canonical: `/${locale}/buy` } };
}

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function BuyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Search> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const sp = await searchParams;

  const [ctx, all, models] = await Promise.all([getSiteContext(), getVisibleProducts(), getModels()]);
  const display = ctx.displayCurrency;
  const effectiveInDisplay = (p: ProductWithRelations) =>
    convert(Number(p.offer_price ?? p.price), p.currency, display, ctx.rates) ?? Number(p.offer_price ?? p.price);

  const f = {
    model: one(sp.model),
    storage: Number(one(sp.storage)) || 0,
    color: one(sp.color),
    condition: one(sp.condition) as DeviceCondition | "",
    shop: one(sp.shop),
    battery: Number(one(sp.battery)) || 0,
    min: Number(one(sp.min)) || 0,
    max: Number(one(sp.max)) || 0,
    reserved: one(sp.reserved) === "1",
    sort: one(sp.sort) || "newest",
    page: Math.max(1, Number(one(sp.page)) || 1),
  };

  // Facets come from the whole visible stock so customers only see options that exist.
  const modelIds = new Set(all.map((p) => p.model_id));
  const modelOptions = models.filter((m) => modelIds.has(m.id));
  const storageOptions = [...new Set(all.map((p) => p.storage_gb))].sort((a, b) => a - b);
  const colorOptions = [...new Set(all.map((p) => p.color))].sort((a, b) => a.localeCompare(b));
  const shopOptions = ctx.shops.filter((s) => all.some((p) => p.shop_id === s.id));
  const selectedModel = models.find((m) => m.slug === f.model);

  let rows = all.filter((p) => {
    if (!f.reserved && p.status !== "available") return false;
    if (selectedModel && p.model_id !== selectedModel.id) return false;
    if (f.storage && p.storage_gb !== f.storage) return false;
    if (f.color && p.color.toLowerCase() !== f.color.toLowerCase()) return false;
    if (f.condition && p.condition !== f.condition) return false;
    if (f.shop && p.shop_id !== f.shop) return false;
    if (f.battery && (p.battery_health ?? 0) < f.battery) return false;
    const price = effectiveInDisplay(p);
    if (f.min && price < f.min) return false;
    if (f.max && price > f.max) return false;
    return true;
  });

  rows = [...rows].sort((a, b) => {
    switch (f.sort) {
      case "price_asc":
        return effectiveInDisplay(a) - effectiveInDisplay(b);
      case "price_desc":
        return effectiveInDisplay(b) - effectiveInDisplay(a);
      case "battery":
        return (b.battery_health ?? 0) - (a.battery_health ?? 0);
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = [f.model, f.storage, f.color, f.condition, f.shop, f.battery, f.min, f.max].filter(Boolean).length;

  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "page" && one(v)) q.set(k, one(v));
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return `/${locale}/buy${s ? `?${s}` : ""}`;
  };

  const filters = (
    <form method="get" action={`/${locale}/buy`} className="space-y-6">
      <Field label={dict.catalogue.model} htmlFor="f-model">
        <Select id="f-model" name="model" defaultValue={f.model}>
          <option value="">{dict.catalogue.allModels}</option>
          {modelOptions.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={`${dict.catalogue.price} (${display})`}>
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" name="min" min={0} inputMode="numeric" placeholder={dict.catalogue.min} defaultValue={f.min || ""} aria-label={dict.catalogue.min} />
          <Input type="number" name="max" min={0} inputMode="numeric" placeholder={dict.catalogue.max} defaultValue={f.max || ""} aria-label={dict.catalogue.max} />
        </div>
      </Field>
      <Field label={dict.catalogue.storage} htmlFor="f-storage">
        <Select id="f-storage" name="storage" defaultValue={f.storage || ""}>
          <option value="">{dict.common.all}</option>
          {storageOptions.map((s) => (
            <option key={s} value={s}>
              {formatStorage(s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={dict.catalogue.color} htmlFor="f-color">
        <Select id="f-color" name="color" defaultValue={f.color}>
          <option value="">{dict.common.all}</option>
          {colorOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={dict.catalogue.battery} htmlFor="f-battery">
        <Select id="f-battery" name="battery" defaultValue={f.battery || ""}>
          <option value="">{dict.common.all}</option>
          {[95, 90, 85, 80].map((pct) => (
            <option key={pct} value={pct}>
              {t(dict.catalogue.batteryMin, { pct })}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={dict.catalogue.condition} htmlFor="f-condition">
        <Select id="f-condition" name="condition" defaultValue={f.condition}>
          <option value="">{dict.common.all}</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {dict.conditions[c]}
            </option>
          ))}
        </Select>
      </Field>
      {shopOptions.length > 1 ? (
        <Field label={dict.catalogue.shop} htmlFor="f-shop">
          <Select id="f-shop" name="shop" defaultValue={f.shop}>
            <option value="">{dict.common.all}</option>
            {shopOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city ? `${s.name} — ${s.city}` : s.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label={dict.catalogue.availability} htmlFor="f-reserved">
        <Select id="f-reserved" name="reserved" defaultValue={f.reserved ? "1" : ""}>
          <option value="">{dict.catalogue.availableOnly}</option>
          <option value="1">{dict.catalogue.includeReserved}</option>
        </Select>
      </Field>
      <input type="hidden" name="sort" value={f.sort} />
      <div className="flex gap-3 pt-2">
        <button type="submit" className={buttonClass("primary", "md", "flex-1")}>
          {dict.catalogue.apply}
        </button>
        {activeFilters ? (
          <Link href={`/${locale}/buy`} className={buttonClass("outline", "md")}>
            {dict.catalogue.reset}
          </Link>
        ) : null}
      </div>
    </form>
  );

  return (
    <div className="container-page py-14 sm:py-20">
      <header className="mb-12 max-w-2xl">
        <p className="eyebrow">{dict.common.buyCta}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{dict.catalogue.title}</h1>
        <p className="mt-4 text-lg text-grey">{dict.catalogue.lead}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside>
          <details className="group rounded-[var(--radius-card)] border border-line p-5 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> {dict.catalogue.filters}
                {activeFilters ? <span className="rounded-full bg-white px-2 text-xs text-black">{activeFilters}</span> : null}
              </span>
              <span className="text-xl text-grey transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="mt-6">{filters}</div>
          </details>
          <div className="sticky top-24 hidden lg:block">{filters}</div>
        </aside>

        <section aria-live="polite">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-grey">{rows.length === 1 ? dict.catalogue.resultsOne : t(dict.catalogue.results, { count: rows.length })}</p>
            <form method="get" action={`/${locale}/buy`} className="flex items-center gap-2">
              {Object.entries(sp)
                .filter(([k, v]) => !["sort", "page"].includes(k) && one(v))
                .map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={one(v)} />
                ))}
              <label htmlFor="sort" className="text-xs text-grey">
                {dict.catalogue.sort}
              </label>
              <AutoSubmitSelect id="sort" name="sort" defaultValue={f.sort} className="!w-auto !py-2 text-xs">
                <option value="newest">{dict.catalogue.sortNewest}</option>
                <option value="price_asc">{dict.catalogue.sortPriceAsc}</option>
                <option value="price_desc">{dict.catalogue.sortPriceDesc}</option>
                <option value="battery">{dict.catalogue.sortBattery}</option>
              </AutoSubmitSelect>
              <noscript>
                <button type="submit" className={buttonClass("outline", "sm")}>
                  OK
                </button>
              </noscript>
            </form>
          </div>

          {visible.length ? (
            <ProductGrid>
              {visible.map((p, i) => (
                <ProductCard key={p.id} product={p} dict={dict} locale={locale} displayCurrency={display} rates={ctx.rates} priority={i < 3} />
              ))}
            </ProductGrid>
          ) : (
            <div className="rounded-[var(--radius-card)] border border-line px-6 py-20 text-center">
              <p className="text-2xl font-semibold">{all.length ? dict.catalogue.emptyTitle : dict.home.emptyStockTitle}</p>
              <p className="mx-auto mt-3 max-w-md text-grey">{all.length ? dict.catalogue.emptyLead : dict.home.emptyStockLead}</p>
              <div className="mt-8 flex justify-center gap-3">
                {activeFilters ? (
                  <Link href={`/${locale}/buy`} className={buttonClass("primary")}>
                    {dict.catalogue.reset}
                  </Link>
                ) : null}
                <Link href={`/${locale}/contact`} className={buttonClass("outline")}>
                  {dict.nav.contact}
                </Link>
              </div>
            </div>
          )}

          {pages > 1 ? (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={pageHref(n)}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm ${n === page ? "border-white bg-white text-black" : "border-line hover:border-white"}`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
