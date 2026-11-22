import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand";
import { Gallery } from "@/components/site/gallery";
import { PriceTag, ProductCard, ProductGrid } from "@/components/site/product-card";
import { RequestDialog, type RequestLabels } from "@/components/site/request-dialog";
import { Badge, buttonClass } from "@/components/ui";
import { formatMoney } from "@/lib/currency";
import { getProduct, getSiteContext, getVisibleProducts } from "@/lib/data/public";
import { publicPhotoUrl, SITE_URL } from "@/lib/env";
import { formatStorage, whatsappLink } from "@/lib/format";
import { getDictionary, intlLocale, isLocale, t } from "@/lib/i18n";

type Params = Promise<{ locale: string; inventoryId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, inventoryId } = await params;
  if (!isLocale(locale)) return {};
  const product = await getProduct(inventoryId).catch(() => null);
  if (!product) return { title: getDictionary(locale).product.notFound };
  const title = `${product.model?.name ?? "iPhone"} ${formatStorage(product.storage_gb)} ${product.color}`;
  const image = product.photos[0] ? publicPhotoUrl(product.photos[0].path) : "/brand/og-image.jpg";
  return {
    title,
    description: `${title} · ${getDictionary(locale).conditions[product.condition]}${product.battery_health != null ? ` · ${product.battery_health}%` : ""} · ${product.inventory_id}`,
    alternates: { canonical: `/${locale}/buy/${product.inventory_id}` },
    openGraph: { title, images: [{ url: image }] },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { locale, inventoryId } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const [ctx, product] = await Promise.all([getSiteContext(), getProduct(inventoryId)]);
  if (!product) notFound();

  const fmt = intlLocale[locale];
  const modelName = product.model?.name ?? "iPhone";
  const title = `${modelName} ${formatStorage(product.storage_gb)}`;
  const effective = Number(product.offer_price ?? product.price);
  const priceText = formatMoney(effective, product.currency, fmt);
  const waNumber = product.shop?.whatsapp || ctx.whatsappNumber;
  const waText = t(dict.whatsapp.product, {
    model: modelName,
    storage: formatStorage(product.storage_gb),
    color: product.color,
    battery: product.battery_health != null ? `${product.battery_health}%` : "—",
    price: priceText,
    id: product.inventory_id,
  });
  const wa = whatsappLink(waNumber, waText);

  const all = await getVisibleProducts();
  const related = all.filter((p) => p.id !== product.id && p.model_id === product.model_id).slice(0, 4);
  const more = related.length ? related : all.filter((p) => p.id !== product.id).slice(0, 4);

  const labels = (title: string, lead: string): RequestLabels => ({
    title,
    lead,
    name: dict.product.name,
    phone: dict.product.phone,
    email: dict.product.email,
    message: dict.product.message,
    optional: dict.common.optional,
    send: dict.common.send,
    sending: dict.common.sending,
    close: dict.common.close,
    sent: dict.product.requestSent,
    error: dict.common.error,
    unavailable: dict.product.notFound,
  });

  const specs: [string, React.ReactNode][] = [
    [dict.product.model, modelName],
    [dict.product.storage, formatStorage(product.storage_gb)],
    [dict.product.color, product.color],
    [dict.product.batteryHealth, product.battery_health != null ? `${product.battery_health}%` : "—"],
    [dict.product.condition, `${dict.conditions[product.condition]} — ${dict.conditionHelp[product.condition]}`],
    [dict.product.parts, dict.product[`parts_${product.parts_status}`]],
    ...(product.replaced_parts ? ([[dict.product.replacedParts, product.replaced_parts]] as [string, string][]) : []),
    [dict.product.store, product.shop ? [product.shop.name, product.shop.city].filter(Boolean).join(" — ") : "—"],
    [dict.product.availability, product.status === "reserved" ? dict.common.reserved : dict.common.available],
    [dict.product.inventoryId, product.inventory_id],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${title} ${product.color}`,
    sku: product.inventory_id,
    brand: { "@type": "Brand", name: "Apple" },
    image: product.photos.map((p) => publicPhotoUrl(p.path)),
    itemCondition: "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      price: effective,
      priceCurrency: product.currency,
      availability: product.status === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
      url: `${SITE_URL}/${locale}/buy/${product.inventory_id}`,
      seller: { "@type": "Organization", name: "iZone" },
    },
  };

  return (
    <div className="stage light-top">
    <div className="container-page py-10 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href={`/${locale}/buy`} className="group inline-flex items-center gap-2 text-sm text-grey transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" aria-hidden="true" /> {dict.catalogue.title}
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery
          photos={product.photos.map((p) => publicPhotoUrl(p.path))}
          alt={`${title} ${product.color}`}
          emptyLabel={dict.product.noPhotos}
          photoLabel={dict.product.photo}
        />

        <div className="animate-rise" style={{ ["--rise-delay" as string]: "120ms" }}>
          <div className="flex flex-wrap gap-2">
            <Badge tone={product.status === "reserved" ? "solid" : "outline"}>
              {product.status === "reserved" ? dict.common.reserved : dict.common.available}
            </Badge>
            {product.offer_price != null ? <Badge>{dict.common.offer}</Badge> : null}
            <Badge tone="muted">{product.inventory_id}</Badge>
          </div>
          <h1 className="text-sheen mt-5 text-4xl font-semibold leading-[1.05] sm:text-6xl">{title}</h1>
          <p className="mt-2 text-lg text-grey">
            {product.color} · {dict.conditions[product.condition]}
          </p>

          <div className="surface mt-8 rounded-2xl p-5 sm:p-6">
            <PriceTag product={product} displayCurrency={ctx.displayCurrency} rates={ctx.rates} locale={locale} dict={dict} size="lg" />
            {ctx.displayCurrency !== product.currency ? (
              <p className="mt-2 text-xs text-muted">{t(dict.product.convertedNote, { currency: product.currency })}</p>
            ) : null}
          </div>

          {product.status === "reserved" ? <p className="mt-6 rounded-xl border border-white/12 bg-white/[0.03] p-4 text-sm text-grey">{dict.product.reservedNotice}</p> : null}

          <div className="mt-8 grid gap-3">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp", "lg", "w-full")}>
                <WhatsAppIcon className="h-5 w-5" /> {dict.product.whatsapp}
              </a>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <RequestDialog
                kind="question"
                productId={product.id}
                locale={locale}
                labels={labels(dict.product.askTitle, dict.product.askLead)}
                messageRequired
                triggerClassName={buttonClass("outline", "lg", "w-full")}
                trigger={
                  <>
                    <MessageSquare className="h-4 w-4" aria-hidden="true" /> {dict.product.ask}
                  </>
                }
              />
              <RequestDialog
                kind="reserve"
                productId={product.id}
                locale={locale}
                labels={labels(dict.product.reserveTitle, dict.product.reserveLead)}
                triggerClassName={buttonClass("outline", "lg", "w-full border-white")}
                trigger={dict.product.reserve}
              />
            </div>
          </div>

          <section className="mt-12">
            <h2 className="eyebrow">{dict.product.details}</h2>
            <dl className="surface mt-4 divide-y divide-white/[0.07] rounded-2xl px-5">
              {specs.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-4 text-sm">
                  <dt className="text-grey">{label}</dt>
                  <dd className="text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {product.model && (product.model.display_inches || product.model.chip || product.model.biometrics || product.model.connector || product.model.has_5g != null) ? (
            <section className="mt-10">
              <h2 className="eyebrow">{dict.product.techTitle}</h2>
              <dl className="surface mt-4 divide-y divide-white/[0.07] rounded-2xl px-5">
                {(
                  [
                    [dict.product.display, product.model.display_inches ? `${Number(product.model.display_inches).toFixed(1)}″` : null],
                    [dict.product.chip, product.model.chip],
                    [dict.product.unlock, product.model.biometrics],
                    [dict.product.connector, product.model.connector],
                    [dict.product.network5g, product.model.has_5g == null ? null : product.model.has_5g ? dict.common.yes : dict.common.no],
                  ] as [string, string | null][]
                )
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-4 text-sm">
                      <dt className="text-grey">{label}</dt>
                      <dd className="text-white" dir="ltr">
                        {value}
                      </dd>
                    </div>
                  ))}
              </dl>
            </section>
          ) : null}

          {product.description ? (
            <section className="mt-10">
              <h2 className="eyebrow">{dict.product.description}</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-grey">{product.description}</p>
            </section>
          ) : null}
        </div>
      </div>

      {more.length ? (
        <section className="mt-24">
          <hr className="light-rule mb-16" />
          <h2 className="text-sheen mb-10 text-3xl font-semibold sm:text-4xl" data-reveal>{dict.product.otherPhones}</h2>
          <ProductGrid>
            {more.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} dict={dict} locale={locale} displayCurrency={ctx.displayCurrency} rates={ctx.rates} />
            ))}
          </ProductGrid>
        </section>
      ) : null}
    </div>
    </div>
  );
}
