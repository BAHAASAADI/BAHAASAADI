import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Mail, Phone, Star } from "lucide-react";
import { Logo, WhatsAppIcon } from "@/components/brand";
import { ProductCard, ProductGrid } from "@/components/site/product-card";
import { ShopCard } from "@/components/site/shop-card";
import { buttonClass, SectionHeading } from "@/components/ui";
import { getFaqs, getProducts, getReviews, getShopStockCounts, getSiteContext, getStockSummary } from "@/lib/data/public";
import { telLink, whatsappLink } from "@/lib/format";
import { getDictionary, isLocale, t } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const ctx = await getSiteContext();
  const [featured, recent, summary, reviews, faqs, shopCounts] = await Promise.all([
    getProducts({ featured: true, includeReserved: true }, 8),
    getProducts({ includeReserved: true }, 8),
    getStockSummary(),
    getReviews(),
    getFaqs(locale),
    getShopStockCounts(),
  ]);
  const totalStock = summary.reduce((n, s) => n + s.count, 0);
  const cardProps = { dict, locale, displayCurrency: ctx.displayCurrency, rates: ctx.rates };
  const wa = whatsappLink(ctx.whatsappNumber, dict.whatsapp.general);
  const phone = ctx.settings?.contact_phone || ctx.primaryShop?.phone;
  const tel = telLink(phone);
  const email = ctx.settings?.contact_email;

  return (
    <>
      {/* HERO — the logo is the main identity; the shop photograph stays secondary */}
      <section className="container-page pb-20 pt-14 sm:pb-28 sm:pt-20">
        <div className="animate-fade-up flex flex-col items-center text-center">
          <h1 className="w-full">
            <Logo priority className="mx-auto w-[min(86vw,760px)]" sizes="(min-width: 900px) 760px, 86vw" />
          </h1>
          <p className="mt-5 ps-[0.42em] text-[0.7rem] tracking-[0.42em] text-white sm:mt-7 sm:text-base">{dict.common.slogan}</p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl items-center gap-12 sm:mt-24 md:grid-cols-[minmax(0,1fr)_300px] md:gap-16">
          <div className="text-center md:text-start">
            <p className="text-4xl font-semibold tracking-tight sm:text-6xl" dir="ltr">
              {dict.hero.headline}
            </p>
            <p className="mx-auto mt-5 max-w-md text-base text-grey sm:text-lg md:mx-0">{dict.hero.description}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <Link href={`/${locale}/buy`} className={buttonClass("primary", "lg")}>
                {dict.common.buyCta}
              </Link>
              <Link href={`/${locale}/sell`} className={buttonClass("outline", "lg", "border-white")}>
                {dict.common.sellCta}
              </Link>
            </div>
          </div>
          <figure className="mx-auto w-full max-w-[260px] md:max-w-[300px]">
            <Image
              src="/brand/boutique.jpg"
              alt={dict.hero.photoAlt}
              width={1000}
              height={1154}
              sizes="300px"
              className="h-auto w-full rounded-[var(--radius-card)] border border-line"
            />
          </figure>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length ? (
        <section className="border-t border-line py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading
              title={dict.home.featuredTitle}
              lead={dict.home.featuredLead}
              action={<Link href={`/${locale}/buy`} className={buttonClass("outline", "md")}>{dict.common.viewAll}</Link>}
            />
            <ProductGrid>
              {featured.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 2} {...cardProps} />
              ))}
            </ProductGrid>
          </div>
        </section>
      ) : null}

      {/* RECENTLY ADDED */}
      <section className="border-t border-line py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            title={dict.home.recentTitle}
            lead={dict.home.recentLead}
            action={recent.length ? <Link href={`/${locale}/buy`} className={buttonClass("outline", "md")}>{dict.common.viewAll}</Link> : null}
          />
          {recent.length ? (
            <ProductGrid>
              {recent.map((p) => (
                <ProductCard key={p.id} product={p} {...cardProps} />
              ))}
            </ProductGrid>
          ) : (
            <div className="rounded-[var(--radius-card)] border border-line px-6 py-16 text-center">
              <p className="text-2xl font-semibold">{dict.home.emptyStockTitle}</p>
              <p className="mx-auto mt-3 max-w-md text-grey">{dict.home.emptyStockLead}</p>
              <div className="mt-8 flex justify-center gap-3">
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
                    <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                  </a>
                ) : null}
                <Link href={`/${locale}/sell`} className={buttonClass("outline")}>
                  {dict.common.sellCta}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* AVAILABLE STOCK */}
      {summary.length ? (
        <section className="border-t border-line py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading
              title={dict.home.stockTitle}
              lead={dict.home.stockLead}
              action={
                <p className="text-sm text-grey">
                  {totalStock === 1 ? dict.home.stockCountOne : t(dict.home.stockCount, { count: totalStock })}
                </p>
              }
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.map(({ model, count }) => (
                <li key={model.id}>
                  <Link
                    href={`/${locale}/buy?model=${model.slug}&reserved=1`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-line px-6 py-5 transition-colors hover:border-grey"
                  >
                    <span className="font-medium">{model.name}</span>
                    <span className="flex items-center gap-2 text-sm text-grey">
                      {count === 1 ? dict.home.stockCountOne : t(dict.home.stockCount, { count })}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* HOW TO SELL */}
      <section className="border-t border-line py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            title={dict.home.howTitle}
            action={<Link href={`/${locale}/sell`} className={buttonClass("primary", "md")}>{dict.common.sellCta}</Link>}
          />
          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {dict.home.howSteps.map((step, i) => (
              <li key={step.title} className="border-t border-white pt-6">
                <span className="text-sm text-grey">0{i + 1}</span>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-grey">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHY IZONE */}
      <section className="border-t border-line py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading title={dict.home.whyTitle} />
          <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {dict.home.whyItems.map((item) => (
              <div key={item.title} className="bg-black p-8">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-grey">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOPS */}
      {ctx.shops.length ? (
        <section className="border-t border-line py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading
              title={dict.home.shopsTitle}
              action={<Link href={`/${locale}/shops`} className={buttonClass("outline", "md")}>{dict.common.viewAll}</Link>}
            />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {ctx.shops.slice(0, 3).map((shop) => (
                <ShopCard key={shop.id} shop={shop} dict={dict} locale={locale} stockCount={shopCounts[shop.id] ?? 0} fallbackWhatsapp={ctx.settings?.whatsapp_number} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* REVIEWS — only real reviews entered by the owner are shown */}
      {reviews.length ? (
        <section className="border-t border-line py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading title={dict.home.reviewsTitle} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r) => (
                <figure key={r.id} className="flex flex-col rounded-[var(--radius-card)] border border-line p-7">
                  <div className="flex gap-1" aria-label={`${r.rating}/5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-white text-white" : "text-line"}`} aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 leading-relaxed text-white">“{r.body}”</blockquote>
                  <figcaption className="mt-6 text-sm text-grey">
                    {r.author_name}
                    {r.source ? <span className="text-muted"> · {r.source}</span> : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      {faqs.length ? (
        <section className="border-t border-line py-20 sm:py-28">
          <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{dict.home.faqTitle}</h2>
              <Link href={`/${locale}/faq`} className={buttonClass("outline", "md", "mt-8")}>
                {dict.common.viewAll}
              </Link>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {faqs.slice(0, 5).map((f) => (
                <details key={f.id} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium">
                    {f.question}
                    <span className="text-2xl font-light text-grey transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl leading-relaxed text-grey">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CONTACT */}
      <section className="border-t border-line py-20 sm:py-28">
        <div className="container-page">
          <div className="rounded-[var(--radius-card)] border border-line px-6 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{dict.home.contactTitle}</h2>
            <p className="mx-auto mt-4 max-w-md text-grey">{dict.home.contactLead}</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
                  <WhatsAppIcon className="h-4 w-4" /> WhatsApp
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
              <Link href={`/${locale}/contact`} className={buttonClass("outline")}>
                {dict.nav.contact}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
