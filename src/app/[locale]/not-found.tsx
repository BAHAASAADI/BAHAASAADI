import Link from "next/link";
import { headers } from "next/headers";
import { buttonClass } from "@/components/ui";
import { defaultLocale, getDictionary, isLocale } from "@/lib/i18n";

export default async function NotFound() {
  const value = (await headers()).get("x-izone-locale");
  const locale = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(locale);
  return (
    <div className="stage light-grid light-top flex min-h-[60vh] flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sheen-soft font-display text-7xl font-semibold sm:text-8xl">404</p>
      <h1 className="text-sheen mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">{dict.errors.notFoundTitle}</h1>
      <p className="mt-4 max-w-md text-grey">{dict.errors.notFoundLead}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href={`/${locale}`} className={buttonClass("primary")}>
          {dict.errors.home}
        </Link>
        <Link href={`/${locale}/buy`} className={buttonClass("outline")}>
          {dict.common.buyCta}
        </Link>
      </div>
    </div>
  );
}
