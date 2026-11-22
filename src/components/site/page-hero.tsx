import type { ReactNode } from "react";

/**
 * Shared, lit opening for inner pages: a faint grid, a spotlight from above
 * and the page title in metallic type. Content below sits on plain black.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  align = "start",
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  align?: "start" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <section className={`stage light-grid light-top pb-10 pt-14 sm:pb-14 sm:pt-20 ${className}`}>
      <div className={`container-page animate-rise ${centered ? "text-center" : ""}`}>
        {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
        <h1 className="text-sheen text-4xl font-semibold leading-[1.05] sm:text-6xl">{title}</h1>
        {lead ? <p className={`mt-4 max-w-2xl text-base text-grey sm:text-lg ${centered ? "mx-auto" : ""}`}>{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
