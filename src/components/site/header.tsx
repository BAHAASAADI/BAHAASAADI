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
    <header className="sticky top-0 z-40 border-b border-line bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href={`/${locale}`} aria-label="iZone" className="shrink-0">
          <Logo className="w-[84px] sm:w-[96px]" sizes="96px" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm tracking-wide transition-colors ${isActive(l.href) ? "text-white" : "text-grey hover:text-white"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/search`}
            aria-label={labels.search}
            className="flex h-10 w-10 items-center justify-center rounded-full text-grey transition-colors hover:text-white"
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
        <nav id="mobile-nav" aria-label="Mobile" className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-black md:hidden">
          <ul className="container-page py-4">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex items-center justify-between border-b border-line py-5 text-2xl font-medium tracking-tight">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
