import Link from "next/link";
import { deleteContent, saveFaq, savePage, saveReview } from "@/app/admin/actions/setup";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getLookups } from "@/lib/admin/data";
import { localeNames, locales } from "@/lib/i18n/config";
import type { ContentPage, Faq, Review } from "@/lib/types";

export const metadata = { title: "Website content" };

const PAGES: { slug: ContentPage["slug"]; label: string }[] = [
  { slug: "privacy", label: "Privacy policy" },
  { slug: "terms", label: "Terms and conditions" },
  { slug: "trade-in-conditions", label: "Trade-in conditions" },
];

export default async function ContentAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; lang?: string }> }) {
  const { supabase } = await requireAdmin("manager");
  const { tab = "reviews", lang = "en" } = await searchParams;
  const { shops } = await getLookups();
  const locale = (locales as readonly string[]).includes(lang) ? lang : "en";

  const [{ data: reviews }, { data: faqs }, { data: pages }] = await Promise.all([
    supabase.from("reviews").select("*").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("faqs").select("*").eq("locale", locale).order("sort_order"),
    supabase.from("pages").select("*").eq("locale", locale),
  ]);

  const tabs = [
    { key: "reviews", label: "Customer reviews" },
    { key: "faq", label: "FAQ" },
    { key: "pages", label: "Legal pages" },
  ];

  return (
    <>
      <PageHeader title="Website content" description="Reviews, frequently asked questions and legal pages. FAQ and legal pages are written per language." />
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/content?tab=${t.key}&lang=${locale}`} className={`rounded-full px-4 py-2 text-sm ${tab === t.key ? "bg-white text-black" : "border border-line text-grey hover:text-white"}`}>
            {t.label}
          </Link>
        ))}
        {tab !== "reviews" ? (
          <span className="ms-auto flex flex-wrap gap-2">
            {locales.map((l) => (
              <Link key={l} href={`/admin/content?tab=${tab}&lang=${l}`} className={`rounded-full px-3 py-2 text-xs ${locale === l ? "bg-white text-black" : "border border-line text-grey hover:text-white"}`}>
                {localeNames[l]}
              </Link>
            ))}
          </span>
        ) : null}
      </div>

      {tab === "reviews" ? (
        <>
          <Panel title="Add a review" description="Only publish genuine reviews from real customers (for example copied from Google with the customer's name)." className="mb-6">
            <ReviewForm shops={shops} />
          </Panel>
          <div className="space-y-3">
            {((reviews ?? []) as Review[]).map((r) => (
              <details key={r.id} className="rounded-2xl border border-line">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                  <span>
                    <span className="font-medium">{r.author_name}</span> <span className="text-grey">· {"★".repeat(r.rating)}</span>
                    {!r.is_published ? <Badge tone="muted">Hidden</Badge> : null}
                  </span>
                  <span className="max-w-xl truncate text-sm text-grey">{r.body}</span>
                </summary>
                <div className="border-t border-line p-4">
                  <ReviewForm review={r} shops={shops} />
                  <div className="mt-3">
                    <ActionButton action={deleteContent} fields={{ table: "reviews", id: r.id }} variant="ghost" confirm="Delete this review?">
                      Delete review
                    </ActionButton>
                  </div>
                </div>
              </details>
            ))}
            {!reviews?.length ? <p className="text-sm text-grey">No reviews yet. The reviews section stays hidden on the website until you publish one.</p> : null}
          </div>
        </>
      ) : null}

      {tab === "faq" ? (
        <>
          <Panel title={`Add a question (${localeNames[locale as keyof typeof localeNames]})`} className="mb-6">
            <FaqForm locale={locale} />
          </Panel>
          <div className="space-y-3">
            {((faqs ?? []) as Faq[]).map((f) => (
              <details key={f.id} className="rounded-2xl border border-line">
                <summary className="cursor-pointer list-none p-4 font-medium">
                  {f.question} {!f.is_published ? <Badge tone="muted">Hidden</Badge> : null}
                </summary>
                <div className="border-t border-line p-4">
                  <FaqForm faq={f} locale={locale} />
                  <div className="mt-3">
                    <ActionButton action={deleteContent} fields={{ table: "faqs", id: f.id }} variant="ghost" confirm="Delete this question?">
                      Delete question
                    </ActionButton>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </>
      ) : null}

      {tab === "pages" ? (
        <div className="space-y-6">
          <p className="text-sm text-grey">Format: blank line between paragraphs, “## ” at the start of a line for a heading, “- ” for a bullet point. These are templates — have them checked by a legal adviser for your country.</p>
          {PAGES.map((p) => {
            const page = ((pages ?? []) as ContentPage[]).find((x) => x.slug === p.slug);
            return (
              <Panel key={p.slug} title={p.label} actions={<Link href={`/${locale}/${p.slug}`} target="_blank" className="text-xs text-grey hover:text-white">View ↗</Link>}>
                <ActionForm action={savePage} className="space-y-4">
                  <input type="hidden" name="slug" value={p.slug} />
                  <input type="hidden" name="locale" value={locale} />
                  <Field label="Title" htmlFor={`${p.slug}-title`}>
                    <Input id={`${p.slug}-title`} name="title" defaultValue={page?.title ?? ""} required />
                  </Field>
                  <Field label="Content" htmlFor={`${p.slug}-body`}>
                    <Textarea id={`${p.slug}-body`} name="body" defaultValue={page?.body ?? ""} rows={14} required />
                  </Field>
                  <SubmitButton>Save page</SubmitButton>
                </ActionForm>
              </Panel>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function ReviewForm({ review, shops }: { review?: Review; shops: { id: string; name: string }[] }) {
  const p = review?.id ?? "new";
  return (
    <ActionForm action={saveReview} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" resetOnSuccess={!review}>
      {review ? <input type="hidden" name="id" value={review.id} /> : null}
      <Field label="Customer name" htmlFor={`${p}-author`}>
        <Input id={`${p}-author`} name="author_name" defaultValue={review?.author_name ?? ""} required />
      </Field>
      <Field label="Rating" htmlFor={`${p}-rating`}>
        <Select id={`${p}-rating`} name="rating" defaultValue={review?.rating ?? 5}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Source" htmlFor={`${p}-source`}>
        <Input id={`${p}-source`} name="source" defaultValue={review?.source ?? ""} placeholder="Google, in store…" />
      </Field>
      <Field label="Date" htmlFor={`${p}-date`}>
        <Input id={`${p}-date`} name="review_date" type="date" defaultValue={review?.review_date ?? ""} />
      </Field>
      <Field label="Review" htmlFor={`${p}-body`} className="sm:col-span-2 lg:col-span-3">
        <Textarea id={`${p}-body`} name="body" defaultValue={review?.body ?? ""} rows={3} required />
      </Field>
      <div className="grid content-end gap-3">
        <Select name="shop_id" defaultValue={review?.shop_id ?? ""} aria-label="Shop">
          <option value="">No specific shop</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Input name="sort_order" type="number" defaultValue={review?.sort_order ?? 0} aria-label="Order" />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={review?.is_published ?? true} className="h-4 w-4 accent-white" /> Published
        </label>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <SubmitButton>{review ? "Save review" : "Add review"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function FaqForm({ faq, locale }: { faq?: Faq; locale: string }) {
  const p = faq?.id ?? "new";
  return (
    <ActionForm action={saveFaq} className="grid gap-4" resetOnSuccess={!faq}>
      {faq ? <input type="hidden" name="id" value={faq.id} /> : null}
      <input type="hidden" name="locale" value={locale} />
      <Field label="Question" htmlFor={`${p}-q`}>
        <Input id={`${p}-q`} name="question" defaultValue={faq?.question ?? ""} required />
      </Field>
      <Field label="Answer" htmlFor={`${p}-a`}>
        <Textarea id={`${p}-a`} name="answer" defaultValue={faq?.answer ?? ""} rows={3} required />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <Input name="sort_order" type="number" defaultValue={faq?.sort_order ?? 100} className="max-w-28" aria-label="Order" />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={faq?.is_published ?? true} className="h-4 w-4 accent-white" /> Published
        </label>
        <SubmitButton>{faq ? "Save" : "Add question"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
