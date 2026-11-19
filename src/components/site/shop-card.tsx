import Link from "next/link";
import { Clock, ExternalLink, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand";
import { telLink, whatsappLink } from "@/lib/format";
import { t, type Dictionary, type Locale } from "@/lib/i18n";
import type { Shop } from "@/lib/types";

export function ShopCard({
  shop,
  dict,
  locale,
  stockCount,
  fallbackWhatsapp,
}: {
  shop: Shop;
  dict: Dictionary;
  locale: Locale;
  stockCount?: number;
  fallbackWhatsapp?: string | null;
}) {
  const address = [shop.address, [shop.city, shop.country].filter(Boolean).join(", ")].filter(Boolean);
  const wa = whatsappLink(shop.whatsapp || fallbackWhatsapp, dict.whatsapp.general);
  const tel = telLink(shop.phone);

  return (
    <article className="flex flex-col rounded-[var(--radius-card)] border border-line p-6 sm:p-8">
      <h3 className="text-2xl font-semibold tracking-tight">{shop.name}</h3>
      {stockCount != null ? <p className="mt-1 text-sm text-grey">{stockCount === 1 ? dict.shops.stockOne : t(dict.shops.stock, { count: stockCount })}</p> : null}
      <dl className="mt-6 space-y-4 text-sm">
        {address.length ? (
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-grey" aria-hidden="true" />
            <div>
              <dt className="sr-only">{dict.contact.address}</dt>
              {address.map((line) => (
                <dd key={line} className="text-white">
                  <bdi>{line}</bdi>
                </dd>
              ))}
            </div>
          </div>
        ) : null}
        {shop.opening_hours ? (
          <div className="flex gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-grey" aria-hidden="true" />
            <div>
              <dt className="sr-only">{dict.contact.hours}</dt>
              <dd className="whitespace-pre-line text-grey">
                <bdi>{shop.opening_hours}</bdi>
              </dd>
            </div>
          </div>
        ) : null}
        {tel ? (
          <div className="flex gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-grey" aria-hidden="true" />
            <div>
              <dt className="sr-only">{dict.contact.phone}</dt>
              <dd>
                <a href={tel} className="hover:underline" dir="ltr">
                  {shop.phone}
                </a>
              </dd>
            </div>
          </div>
        ) : null}
      </dl>
      <div className="mt-8 flex flex-wrap gap-2">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-xs transition-colors hover:border-white">
            <WhatsAppIcon className="h-4 w-4" /> {dict.contact.whatsapp}
          </a>
        ) : null}
        {shop.maps_url ? (
          <a href={shop.maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-xs transition-colors hover:border-white">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> {dict.contact.maps}
          </a>
        ) : null}
        {stockCount ? (
          <Link href={`/${locale}/buy?shop=${shop.id}`} className="inline-flex h-10 items-center rounded-full border border-line px-4 text-xs transition-colors hover:border-white">
            {dict.shops.viewStock}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
