import Link from "next/link";
import { headers } from "next/headers";
import { buttonClass } from "@/components/ui";
import { defaultLocale, getDictionary, isLocale } from "@/lib/i18n";

export default async function NotFound() {
  const value = (await headers()).get("x-izone-locale");
  const locale = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(locale);
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{dict.errors.notFoundTitle}</h1>
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
