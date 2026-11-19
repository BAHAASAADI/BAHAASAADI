import Image from "next/image";
import Link from "next/link";
import { BatteryMedium, MapPin } from "lucide-react";
import { Badge } from "@/components/ui";
import { displayPrice, type RateTable } from "@/lib/currency";
import { publicPhotoUrl } from "@/lib/env";
import { formatStorage } from "@/lib/format";
import { intlLocale, type Dictionary, type Locale } from "@/lib/i18n";
import type { Product, ProductWithRelations } from "@/lib/types";

export function PriceTag({
  product,
  displayCurrency,
  rates,
  locale,
  dict,
  size = "md",
}: {
  product: Pick<Product, "price" | "offer_price" | "currency">;
  displayCurrency: string;
  rates: RateTable;
  locale: Locale;
  dict: Dictionary;
  size?: "md" | "lg";
}) {
  const fmt = intlLocale[locale];
  const effective = product.offer_price ?? product.price;
  const main = displayPrice(Number(effective), product.currency, displayCurrency, rates, fmt);
  const before = product.offer_price != null ? displayPrice(Number(product.price), product.currency, displayCurrency, rates, fmt) : null;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={size === "lg" ? "text-3xl font-semibold tracking-tight sm:text-4xl" : "text-lg font-semibold"} dir="ltr">
          {main.approximate ? "≈ " : ""}
          {main.text}
        </span>
        {before ? (
          <span className="text-sm text-muted line-through" dir="ltr">
            {before.text}
          </span>
        ) : null}
      </div>
      {main.approximate ? (
        <span className="text-xs text-muted" dir="ltr">
          {product.offer_price != null ? `${dict.common.offer} · ` : ""}
          {main.original}
        </span>
      ) : null}
    </div>
  );
}

export function ProductCard({
  product,
  dict,
  locale,
  displayCurrency,
  rates,
  priority = false,
}: {
  product: ProductWithRelations;
  dict: Dictionary;
  locale: Locale;
  displayCurrency: string;
  rates: RateTable;
  priority?: boolean;
}) {
  const photo = product.photos[0];
  const title = product.model?.name ?? "iPhone";
  return (
    <Link
      href={`/${locale}/buy/${product.inventory_id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-black transition-colors duration-300 hover:border-grey"
    >
      <div className="relative aspect-square overflow-hidden bg-black">
        {photo ? (
          <Image
            src={publicPhotoUrl(photo.path)}
            alt={`${title} ${formatStorage(product.storage_gb)} ${product.color}`}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 border-b border-line text-center">
            <span className="text-2xl font-semibold tracking-tight">{title}</span>
            <span className="text-xs text-muted">{dict.product.noPhotos}</span>
          </div>
        )}
        <div className="absolute start-3 top-3 flex gap-2">
          {product.status === "reserved" ? <Badge tone="solid">{dict.common.reserved}</Badge> : <Badge>{dict.common.available}</Badge>}
          {product.offer_price != null ? <Badge>{dict.common.offer}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-grey">
            {formatStorage(product.storage_gb)} · {product.color} · {dict.conditions[product.condition]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-grey">
          {product.battery_health != null ? (
            <span className="flex items-center gap-1">
              <BatteryMedium className="h-3.5 w-3.5" aria-hidden="true" />
              {product.battery_health}%
            </span>
          ) : null}
          {product.shop ? (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {product.shop.city || product.shop.name}
            </span>
          ) : null}
          <span className="text-muted">{product.inventory_id}</span>
        </div>
        <p className="text-xs text-grey">
          {dict.product.parts}: {dict.product[`parts_${product.parts_status}`]}
        </p>
        <div className="mt-auto pt-2">
          <PriceTag product={product} displayCurrency={displayCurrency} rates={rates} locale={locale} dict={dict} />
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
