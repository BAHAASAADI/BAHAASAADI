import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopCard } from "@/components/site/shop-card";
import { getShopStockCounts, getSiteContext } from "@/lib/data/public";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.shops.title, description: dict.shops.lead, alternates: { canonical: `/${locale}/shops` } };
}

export default async function ShopsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const [ctx, counts] = await Promise.all([getSiteContext(), getShopStockCounts()]);

  return (
    <div className="container-page py-14 sm:py-20">
      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{dict.shops.title}</h1>
        <p className="mt-4 text-lg text-grey">{dict.shops.lead}</p>
      </header>
      {ctx.shops.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ctx.shops.map((shop) => (
            <ShopCard key={shop.id} shop={shop} dict={dict} locale={locale} stockCount={counts[shop.id] ?? 0} fallbackWhatsapp={ctx.settings?.whatsapp_number} />
          ))}
        </div>
      ) : (
        <p className="rounded-[var(--radius-card)] border border-line p-8 text-grey">{dict.contact.noShops}</p>
      )}
    </div>
  );
}
