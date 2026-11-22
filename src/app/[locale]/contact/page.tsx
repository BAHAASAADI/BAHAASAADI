import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand";
import { PageHero } from "@/components/site/page-hero";
import { RequestForm } from "@/components/site/request-dialog";
import { ShopCard } from "@/components/site/shop-card";
import { buttonClass } from "@/components/ui";
import { getShopStockCounts, getSiteContext } from "@/lib/data/public";
import { telLink, whatsappLink } from "@/lib/format";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.contact.title, description: dict.contact.lead, alternates: { canonical: `/${locale}/contact` } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const [ctx, counts] = await Promise.all([getSiteContext(), getShopStockCounts()]);
  const wa = whatsappLink(ctx.whatsappNumber, dict.whatsapp.general);
  const phone = ctx.settings?.contact_phone;
  const tel = telLink(phone);
  const email = ctx.settings?.contact_email;

  return (
    <>
    <PageHero title={dict.contact.title} lead={dict.contact.lead}>
        <div className="mt-8 flex flex-wrap gap-3">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp")}>
              <WhatsAppIcon className="h-4 w-4" /> {dict.contact.whatsapp}
            </a>
          ) : null}
          {tel ? (
            <a href={tel} className={buttonClass("outline")} dir="ltr">
              <Phone className="h-4 w-4" aria-hidden="true" /> {phone}
            </a>
          ) : null}
          {email ? (
            <a href={`mailto:${email}`} className={buttonClass("outline")}>
              <Mail className="h-4 w-4" aria-hidden="true" /> {email}
            </a>
          ) : null}
        </div>
    </PageHero>

    <div className="container-page pb-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="surface self-start rounded-[var(--radius-card)] p-6 sm:p-8" data-reveal>
          <h2 className="text-sheen mb-6 text-2xl font-semibold tracking-tight">{dict.contact.formTitle}</h2>
          <RequestForm
            kind="contact"
            locale={locale}
            messageRequired
            labels={{
              title: dict.contact.formTitle,
              lead: "",
              name: dict.product.name,
              phone: dict.product.phone,
              email: dict.product.email,
              message: dict.product.message,
              optional: dict.common.optional,
              send: dict.common.send,
              sending: dict.common.sending,
              close: dict.common.close,
              sent: dict.contact.sent,
              error: dict.common.error,
              unavailable: dict.common.error,
            }}
          />
        </section>
        <section className="grid content-start gap-5">
          {ctx.shops.length ? (
            ctx.shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} dict={dict} locale={locale} stockCount={counts[shop.id] ?? 0} fallbackWhatsapp={ctx.settings?.whatsapp_number} />
            ))
          ) : (
            <p className="surface rounded-[var(--radius-card)] p-8 text-grey">{dict.contact.noShops}</p>
          )}
        </section>
      </div>
    </div>
    </>
  );
}
