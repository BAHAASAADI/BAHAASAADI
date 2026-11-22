import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ProductCard, ProductGrid } from "@/components/site/product-card";
import { buttonClass, Input } from "@/components/ui";
import { getFaqs, getProducts, getSiteContext } from "@/lib/data/public";
import { getDictionary, isLocale, t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).search.title, robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);

  const [ctx, products, faqs] = q
    ? await Promise.all([getSiteContext(), getProducts({ q, includeReserved: true }, 1000), getFaqs(locale)])
    : [await getSiteContext(), [], []];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const faqMatches = faqs.filter((f) => terms.every((term) => `${f.question} ${f.answer}`.toLowerCase().includes(term)));

  return (
    <>
    <PageHero title={dict.search.title}>
      <form action={`/${locale}/search`} method="get" role="search" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder={dict.common.searchPlaceholder} className="ps-11" aria-label={dict.common.search} autoFocus />
        </div>
        <button type="submit" className={buttonClass("primary")}>
          {dict.common.search}
        </button>
      </form>
    </PageHero>
    <div className="container-page pb-10">
      {!q ? (
        <p className="text-grey">{dict.search.prompt}</p>
      ) : (
        <>
          <p className="text-sm text-grey">{t(dict.search.resultsFor, { q })}</p>
          {products.length ? (
            <section className="mt-8">
              <h2 className="eyebrow mb-6">{dict.search.phones}</h2>
              <ProductGrid>
                {products.map((p, i) => (
                  <ProductCard key={p.id} index={i} product={p} dict={dict} locale={locale} displayCurrency={ctx.displayCurrency} rates={ctx.rates} />
                ))}
              </ProductGrid>
            </section>
          ) : null}
          {faqMatches.length ? (
            <section className="mt-14">
              <h2 className="eyebrow mb-6">{dict.search.pages}</h2>
              <ul className="surface divide-y divide-white/[0.07] rounded-[var(--radius-card)] px-6">
                {faqMatches.map((f) => (
                  <li key={f.id} className="py-5">
                    <Link href={`/${locale}/faq`} className="font-medium hover:underline">
                      {f.question}
                    </Link>
                    <p className="mt-2 text-sm text-grey">{f.answer}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {!products.length && !faqMatches.length ? <p className="mt-8 text-grey">{dict.search.empty}</p> : null}
        </>
      )}
    </div>
    </>
  );
}
