import { Clock, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand";
import { CurrencySwitcher, LocaleSwitcher } from "@/components/site/switchers";
import type { SiteContext } from "@/lib/data/public";
import type { Dictionary, Locale } from "@/lib/i18n";
import { telLink, whatsappLink } from "@/lib/format";

/** Store location, opening hours, contact, WhatsApp, language and currency — editable from the dashboard. */
export function TopBar({ ctx, dict, locale }: { ctx: SiteContext; dict: Dictionary; locale: Locale }) {
  const shop = ctx.primaryShop;
  const location = shop ? [shop.address, shop.city].filter(Boolean).join(", ") || shop.name : null;
  const hours = shop?.opening_hours?.split("\n").filter(Boolean).join(" · ");
  const phone = shop?.phone || ctx.settings?.contact_phone;
  const wa = whatsappLink(ctx.whatsappNumber, dict.whatsapp.general);
  const tel = telLink(phone);

  return (
    <div className="border-b border-white/[0.08] bg-[#050505] text-xs text-grey">
      <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
          {location ? (
            shop?.maps_url ? (
              <a href={shop.maps_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1.5 hover:text-white">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <bdi className="truncate">{location}</bdi>
              </a>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <bdi className="truncate">{location}</bdi>
              </span>
            )
          ) : null}
          {hours ? (
            <span className="flex min-w-0 items-center gap-1.5" title={dict.topbar.hours}>
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <bdi className="truncate">{hours}</bdi>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {tel ? (
            <a href={tel} className="flex items-center gap-1.5 hover:text-white" dir="ltr">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{phone}</span>
              <span className="sm:hidden">{dict.topbar.call}</span>
            </a>
          ) : null}
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white">
              <WhatsAppIcon className="h-3.5 w-3.5" />
              {dict.topbar.whatsapp}
            </a>
          ) : null}
          <LocaleSwitcher locale={locale} label={dict.common.language} />
          <CurrencySwitcher value={ctx.displayCurrency} currencies={ctx.currencies.map((c) => c.code)} label={dict.common.currency} />
        </div>
      </div>
    </div>
  );
}
