import Link from "next/link";
import { AppleLogo, FacebookIcon, InstagramIcon, Logo, TikTokIcon } from "@/components/brand";
import type { SiteContext } from "@/lib/data/public";
import type { Dictionary, Locale } from "@/lib/i18n";

export function Footer({ ctx, dict, locale }: { ctx: SiteContext; dict: Dictionary; locale: Locale }) {
  const social = [
    { href: ctx.settings?.instagram_url, label: "Instagram", Icon: InstagramIcon },
    { href: ctx.settings?.facebook_url, label: "Facebook", Icon: FacebookIcon },
    { href: ctx.settings?.tiktok_url, label: "TikTok", Icon: TikTokIcon },
  ].filter((s) => s.href);

  return (
    <footer className="stage light-bottom mt-24">
      <hr className="light-rule" />
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <AppleLogo className="brand-logo-glow h-9 w-auto text-white" />
            <Logo className="brand-logo-glow w-40" sizes="160px" />
          </div>
          <p className="mt-3 text-[0.68rem] tracking-[0.34em] text-white">{dict.common.slogan}</p>
          {social.length ? (
            <div className="mt-8">
              <p className="eyebrow mb-3">{dict.footer.follow}</p>
              <div className="flex gap-3">
                {social.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-grey transition-all duration-300 hover:border-white hover:text-white hover:shadow-[0_0_24px_-4px_rgb(var(--glow)/calc(0.45*var(--glow-k)))]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <nav aria-label="Footer" className="grid content-start gap-3 text-sm">
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/buy`}>{dict.nav.buy}</Link>
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/sell`}>{dict.nav.sell}</Link>
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/shops`}>{dict.nav.shops}</Link>
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/faq`}>{dict.nav.faq}</Link>
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/contact`}>{dict.nav.contact}</Link>
        </nav>
        <nav aria-label="Legal" className="grid content-start gap-3 text-sm">
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/privacy`}>{dict.footer.privacy}</Link>
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/terms`}>{dict.footer.terms}</Link>
          <Link className="text-grey transition-[color,text-shadow] hover:text-white hover:text-glow" href={`/${locale}/trade-in-conditions`}>{dict.footer.tradeIn}</Link>
        </nav>
      </div>
      <div className="container-page border-t border-white/[0.08] py-6 text-xs leading-relaxed text-muted">
        <p>
          © {new Date().getFullYear()} iZone. {dict.footer.rights}
        </p>
        <p className="mt-1">{dict.footer.trademark}</p>
      </div>
    </footer>
  );
}
