import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPageView } from "@/components/site/content-page";
import { getPage } from "@/lib/data/public";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPage("privacy", locale).catch(() => null);
  return { title: page?.title, alternates: { canonical: `/${locale}/privacy` } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ContentPageView slug="privacy" locale={locale} />;
}
