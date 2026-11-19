import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellWizard } from "@/components/sell/sell-wizard";
import { getSellContext, getSiteContext } from "@/lib/data/public";
import { getDictionary, intlLocale, isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.sell.title, description: dict.sell.lead, alternates: { canonical: `/${locale}/sell` } };
}

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const [ctx, sell] = await Promise.all([getSiteContext(), getSellContext()]);

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <header className="mb-12">
          <p className="eyebrow">{dict.common.sellCta}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{dict.sell.title}</h1>
          <p className="mt-4 text-lg text-grey">{dict.sell.lead}</p>
        </header>
        {ctx.configured && sell.models.length ? (
          <SellWizard
            locale={locale}
            intl={intlLocale[locale]}
            dict={{
              sell: dict.sell,
              conditions: dict.conditions,
              conditionHelp: dict.conditionHelp,
              common: dict.common,
              whatsapp: dict.whatsapp,
              product: dict.product,
            }}
            models={sell.models}
            bestPrices={sell.bestPrices}
            bands={sell.bands}
            shops={ctx.shops.map((s) => ({ id: s.id, name: s.name, city: s.city, whatsapp: s.whatsapp }))}
            mainCurrency={ctx.settings?.main_currency ?? "EUR"}
            displayCurrency={ctx.displayCurrency}
            rates={ctx.rates}
            whatsappNumber={ctx.whatsappNumber}
          />
        ) : (
          <p className="rounded-[var(--radius-card)] border border-line p-8 text-grey">{dict.common.notConfigured}</p>
        )}
      </div>
    </div>
  );
}
