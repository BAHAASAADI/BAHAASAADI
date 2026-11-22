import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Arabic, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { ClickLight, RevealObserver } from "@/components/site/motion";
import { TopBar } from "@/components/site/top-bar";
import { getSiteContext, type SiteContext } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";
import { dir, getDictionary, isLocale, locales } from "@/lib/i18n";

// Live stock and prices: always render at request time.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-grotesk", display: "swap", weight: ["400", "500", "600", "700"] });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap", weight: ["400", "500", "600"] });

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.title, template: `%s · iZone` },
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: "iZone",
      title: dict.meta.title,
      description: dict.meta.description,
      images: [{ url: "/brand/og-image.jpg", width: 1200, height: 630, alt: "iZone — Only Apple Products" }],
      locale,
    },
    twitter: { card: "summary_large_image", title: dict.meta.title, description: dict.meta.description, images: ["/brand/og-image.jpg"] },
  };
}

async function safeContext(): Promise<SiteContext> {
  try {
    return await getSiteContext();
  } catch (error) {
    console.error("Failed to load site context", error);
    return { configured: false, settings: null, shops: [], currencies: [], rates: {}, primaryShop: null, displayCurrency: "EUR", whatsappNumber: null };
  }
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const ctx = await safeContext();

  return (
    <html lang={locale} dir={dir(locale)} className={`${inter.variable} ${grotesk.variable} ${arabic.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:border focus:border-white focus:bg-black focus:px-4 focus:py-2 focus:text-white"
        >
          iZone
        </a>
        <TopBar ctx={ctx} dict={dict} locale={locale} />
        <Header
          locale={locale}
          labels={{
            buy: dict.nav.buy,
            sell: dict.nav.sell,
            shops: dict.nav.shops,
            faq: dict.nav.faq,
            contact: dict.nav.contact,
            search: dict.common.search,
            menu: dict.common.menu,
            close: dict.common.close,
          }}
        />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer ctx={ctx} dict={dict} locale={locale} />
        <RevealObserver />
        <ClickLight />
      </body>
    </html>
  );
}
