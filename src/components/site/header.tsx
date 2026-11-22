"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/brand";
import type { Locale } from "@/lib/i18n/config";

interface NavLabels {
  buy: string;
  sell: string;
  shops: string;
  faq: string;
  contact: string;
  search: string;
  menu: string;
  close: string;
}

export function Header({ locale, labels }: { locale: Locale; labels: NavLabels }) {
  const pathname = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: `/${locale}/buy`, label: labels.buy },
    { href: `/${locale}/sell`, label: labels.sell },
    { href: `/${locale}/shops`, label: labels.shops },
    { href: `/${locale}/faq`, label: labels.faq },
    { href: `/${locale}/contact`, label: labels.contact },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="glass sticky top-0 z-40 border-b border-white/[0.08]">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href={`/${locale}`} aria-label="iZone" className="shrink-0">
          <Logo className="w-[84px] sm:w-[96px]" sizes="96px" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative py-1 text-sm tracking-wide transition-colors duration-300 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-center after:bg-white after:transition-transform after:duration-300 ${isActive(l.href) ? "text-white after:scale-x-100" : "text-grey after:scale-x-0 hover:text-white hover:after:scale-x-100"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/search`}
            aria-label={labels.search}
            className="flex h-10 w-10 items-center justify-center rounded-full text-grey transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? labels.close : labels.menu}
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Mobile" className="stage light-top h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/[0.08] bg-black md:hidden">
          <ul className="container-page py-4">
            {links.map((l, i) => (
              <li key={l.href} className="animate-rise" style={{ ["--rise-delay" as string]: `${i * 50}ms` }}>
                <Link
                  href={l.href}
                  className={`font-display flex items-center justify-between border-b border-white/10 py-5 text-3xl font-medium tracking-tight ${isActive(l.href) ? "text-white" : "text-grey"}`}
                >
                  {l.label}
                  <span className="text-base text-muted" aria-hidden="true">0{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
