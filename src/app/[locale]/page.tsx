import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Mail, Phone, Star } from "lucide-react";
import { Logo, WhatsAppIcon } from "@/components/brand";
import { DeviceVisual } from "@/components/site/device";
import { Parallax } from "@/components/site/motion";
import { ProductCard, ProductGrid } from "@/components/site/product-card";
import { ShopCard } from "@/components/site/shop-card";
import { buttonClass, SectionHeading } from "@/components/ui";
import { getFaqs, getProducts, getReviews, getShopStockCounts, getSiteContext, getStockSummary } from "@/lib/data/public";
import { publicPhotoUrl } from "@/lib/env";
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

  // Hero product visual: real stock photos when the shop has them.
  const heroPhotos = [...featured, ...recent].flatMap((p) => (p.photos[0] ? [{ src: publicPhotoUrl(p.photos[0].path), alt: `${p.model?.name ?? "iPhone"} ${p.color}` }] : []));
  const front = heroPhotos[0];
  const back = heroPhotos[1];

  return (
    <>
      {/* HERO — the logo is the main identity, lit like a product on stage */}
      <section className="stage light-grid -mt-px pb-24 pt-14 sm:pb-32 sm:pt-20">
        <div className="light-cone" aria-hidden="true" />

        <div className="container-page relative">
          <div className="relative flex flex-col items-center text-center">
            <div className="glow-orb animate-breathe left-1/2 top-1/2 h-[22rem] w-[min(110vw,56rem)] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
            <h1 className="animate-rise relative w-full">
              <Logo priority className="mx-auto w-[min(86vw,760px)] drop-shadow-[0_0_38px_rgba(255,255,255,0.35)]" sizes="(min-width: 900px) 760px, 86vw" />
            </h1>
            <p className="animate-rise relative mt-5 ps-[0.42em] text-[0.7rem] tracking-[0.42em] text-white sm:mt-7 sm:text-base" style={{ ["--rise-delay" as string]: "150ms" }}>
              {dict.common.slogan}
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl items-center gap-14 sm:mt-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
            <div className="animate-rise text-center lg:text-start" style={{ ["--rise-delay" as string]: "300ms" }}>
              <p className="text-sheen font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tight sm:text-7xl" dir="ltr">
                {dict.hero.headline}
              </p>
              <p className="mx-auto mt-6 max-w-md text-base text-grey sm:text-lg lg:mx-0">{dict.hero.description}</p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link href={`/${locale}/buy`} className={buttonClass("primary", "lg")}>
                  {dict.common.buyCta}
                  <ArrowUpRight className="btn-arrow h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
                <Link href={`/${locale}/sell`} className={buttonClass("outline", "lg")}>
                  {dict.common.sellCta}
                  <ArrowUpRight className="btn-arrow h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </div>
              {totalStock ? (
                <p className="mt-8 flex items-center justify-center gap-2 text-sm text-grey lg:justify-start">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  {totalStock === 1 ? dict.home.stockCountOne : t(dict.home.stockCount, { count: totalStock })} · {dict.common.available}
                </p>
              ) : null}
            </div>

            {/* Product stage: two devices under a spotlight, with the boutique photo */}
            <div className="animate-rise relative mx-auto h-[26rem] w-full max-w-[30rem] sm:h-[32rem]" style={{ ["--rise-delay" as string]: "450ms" }}>
              <div className="glow-orb animate-breathe left-1/2 top-[45%] h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 sm:h-[30rem] sm:w-[30rem]" aria-hidden="true" />
              <div className="absolute bottom-6 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-white/10 blur-2xl" aria-hidden="true" />
              <Parallax speed={0.05} className="absolute left-[14%] top-[6%] w-[36%]">
                <DeviceVisual tilt={-8} photo={back?.src} alt={back?.alt} className="opacity-80" />
              </Parallax>
              <Parallax speed={0.1} className="animate-float absolute left-[38%] top-0 w-[42%]">
                <DeviceVisual photo={front?.src} alt={front?.alt} />
              </Parallax>
              <figure className="surface absolute bottom-0 end-0 w-[38%] max-w-[190px] overflow-hidden rounded-2xl p-1.5 sm:w-[40%]">
                <Image src="/brand/boutique.jpg" alt={dict.hero.photoAlt} width={1000} height={1154} sizes="190px" className="h-auto w-full rounded-xl" />
              </figure>
            </div>
          </div>
        </div>
      </section>

      <hr className="light-rule" />

      {/* FEATURED */}
      {featured.length ? (
        <section className="stage light-top py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading
              title={dict.home.featuredTitle}
              lead={dict.home.featuredLead}
              action={<Link href={`/${locale}/buy`} className={buttonClass("outline", "md")}>{dict.common.viewAll}</Link>}
            />
            <ProductGrid>
              {featured.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 2} index={i} {...cardProps} />
              ))}
            </ProductGrid>
          </div>
        </section>
      ) : null}

      {/* RECENTLY ADDED */}
      <section className="stage light-top py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            title={dict.home.recentTitle}
            lead={dict.home.recentLead}
            action={recent.length ? <Link href={`/${locale}/buy`} className={buttonClass("outline", "md")}>{dict.common.viewAll}</Link> : null}
          />
          {recent.length ? (
            <ProductGrid>
              {recent.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} {...cardProps} />
              ))}
            </ProductGrid>
          ) : (
            <div className="surface rounded-[var(--radius-card)] px-6 py-16 text-center" data-reveal>
              <p className="font-display text-2xl font-semibold">{dict.home.emptyStockTitle}</p>
              <p className="mx-auto mt-3 max-w-md text-grey">{dict.home.emptyStockLead}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
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
        <section className="stage light-grid py-20 sm:py-28">
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
              {summary.map(({ model, count }, i) => (
                <li key={model.id} data-reveal style={{ ["--reveal-delay" as string]: `${Math.min(i, 6) * 60}ms` }}>
                  <Link
                    href={`/${locale}/buy?model=${model.slug}&reserved=1`}
                    className="surface surface-interactive group flex items-center justify-between gap-4 rounded-2xl px-6 py-5"
                  >
                    <span className="font-display text-lg font-medium">{model.name}</span>
                    <span className="flex items-center gap-2 text-sm text-grey">
                      {count === 1 ? dict.home.stockCountOne : t(dict.home.stockCount, { count })}
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* HOW TO SELL — a real sequence, so the steps are numbered */}
      <section className="stage light-top py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow={dict.common.sellCta}
            title={dict.home.howTitle}
            action={
              <Link href={`/${locale}/sell`} className={buttonClass("primary", "md")}>
                {dict.common.sellCta}
                <ArrowUpRight className="btn-arrow h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            }
          />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dict.home.howSteps.map((step, i) => (
              <li
                key={step.title}
                className="surface surface-interactive flex flex-col rounded-[var(--radius-card)] p-7"
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
              >
                <span className="text-sheen-soft font-display text-5xl font-medium">0{i + 1}</span>
                <h3 className="mt-10 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-grey">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* WHY IZONE */}
      <section className="stage light-grid py-20 sm:py-28">
        <div className="container-page">
          <SectionHeading title={dict.home.whyTitle} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dict.home.whyItems.map((item, i) => (
              <div
                key={item.title}
                className="surface surface-interactive overflow-hidden rounded-[var(--radius-card)] p-8"
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
              >
                <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-white/[0.07] blur-2xl" aria-hidden="true" />
                <h3 className="relative text-lg font-semibold">{item.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-grey">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHOPS */}
      {ctx.shops.length ? (
        <section className="stage light-top py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading
              title={dict.home.shopsTitle}
              action={<Link href={`/${locale}/shops`} className={buttonClass("outline", "md")}>{dict.common.viewAll}</Link>}
            />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {ctx.shops.slice(0, 3).map((shop, i) => (
                <div key={shop.id} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}>
                  <ShopCard shop={shop} dict={dict} locale={locale} stockCount={shopCounts[shop.id] ?? 0} fallbackWhatsapp={ctx.settings?.whatsapp_number} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* REVIEWS — only real reviews entered by the owner are shown */}
      {reviews.length ? (
        <section className="stage light-top py-20 sm:py-28">
          <div className="container-page">
            <SectionHeading title={dict.home.reviewsTitle} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r, i) => (
                <figure key={r.id} className="surface flex flex-col rounded-[var(--radius-card)] p-7" data-reveal style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}>
                  <div className="flex gap-1" aria-label={`${r.rating}/5`}>
                    {Array.from({ length: 5 }, (_, k) => (
                      <Star key={k} className={`h-4 w-4 ${k < r.rating ? "fill-white text-white" : "text-line"}`} aria-hidden="true" />
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
        <section className="stage light-grid py-20 sm:py-28">
          <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div data-reveal>
              <h2 className="text-sheen text-3xl font-semibold sm:text-5xl">{dict.home.faqTitle}</h2>
              <Link href={`/${locale}/faq`} className={buttonClass("outline", "md", "mt-8")}>
                {dict.common.viewAll}
              </Link>
            </div>
            <div className="surface divide-y divide-white/10 rounded-[var(--radius-card)] px-6 sm:px-8" data-reveal>
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

      {/* CONTACT — closing section lit from below */}
      <section className="stage light-bottom py-20 sm:py-28">
        <div className="container-page">
          <div className="surface relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12 sm:py-20" data-reveal>
            <div className="glow-orb left-1/2 top-0 h-72 w-[40rem] max-w-full -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
            <h2 className="text-sheen relative text-3xl font-semibold sm:text-5xl">{dict.home.contactTitle}</h2>
            <p className="relative mx-auto mt-4 max-w-md text-grey">{dict.home.contactLead}</p>
            <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
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
