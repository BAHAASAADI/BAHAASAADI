import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/public";
import { formatDate } from "@/lib/format";
import { intlLocale, type Locale } from "@/lib/i18n";
import type { ContentPage } from "@/lib/types";

/** Renders the simple text format used by editable pages: "## " headings, "- " bullets, blank-line paragraphs. */
export function RichText({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-izone">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const out: React.ReactNode[] = [];
        let bullets: string[] = [];
        const flush = () => {
          if (bullets.length) {
            out.push(
              <ul key={`ul-${out.length}`}>
                {bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>,
            );
            bullets = [];
          }
        };
        for (const line of lines) {
          if (line.startsWith("## ")) {
            flush();
            out.push(<h2 key={`h-${out.length}`}>{line.slice(3)}</h2>);
          } else if (line.startsWith("- ")) {
            bullets.push(line.slice(2));
          } else {
            flush();
            out.push(<p key={`p-${out.length}`}>{line}</p>);
          }
        }
        flush();
        return <div key={i}>{out}</div>;
      })}
    </div>
  );
}

export async function ContentPageView({ slug, locale }: { slug: ContentPage["slug"]; locale: Locale }) {
  const page = await getPage(slug, locale);
  if (!page) notFound();
  return (
    <div className="container-page py-14 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{page.title}</h1>
        <p className="mt-3 text-xs text-muted">{formatDate(page.updated_at, intlLocale[locale])}</p>
        <div className="mt-10">
          <RichText body={page.body} />
        </div>
      </article>
    </div>
  );
}
