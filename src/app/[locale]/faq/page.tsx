import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/page-hero";
import { getFaqs } from "@/lib/data/public";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).faq.title, alternates: { canonical: `/${locale}/faq` } };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const faqs = await getFaqs(locale);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  return (
    <>
    {faqs.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /> : null}
    <PageHero title={dict.faq.title} className="[&_.container-page]:max-w-[52rem]" />
    <div className="container-page pb-10">
      <div className="mx-auto max-w-3xl">
        {faqs.length ? (
          <div className="surface divide-y divide-white/[0.07] rounded-[var(--radius-card)] px-6 sm:px-8" data-reveal>
            {faqs.map((f) => (
              <details key={f.id} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium">
                  {f.question}
                  <span className="text-2xl font-light text-grey transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-4 whitespace-pre-line leading-relaxed text-grey">{f.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-grey">{dict.faq.empty}</p>
        )}
      </div>
    </div>
    </>
  );
}
