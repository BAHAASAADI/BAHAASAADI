import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <div className="container-page py-14 sm:py-20">
      {faqs.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /> : null}
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{dict.faq.title}</h1>
        {faqs.length ? (
          <div className="mt-12 divide-y divide-line border-y border-line">
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
          <p className="mt-10 text-grey">{dict.faq.empty}</p>
        )}
      </div>
    </div>
  );
}
