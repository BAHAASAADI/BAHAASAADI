import Link from "next/link";
import { Empty, PageHeader, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Input, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";

export const metadata = { title: "Price history" };

const KIND: Record<string, string> = { sell: "Selling price", buy: "Buying price", rule: "Deduction", rate: "Exchange rate" };
const PAGE = 100;

function value(v: number | null, field: string, currency: string | null) {
  if (v == null) return "—";
  if (field === "percent") return `${Number(v)}%`;
  if (field === "rate") return Number(v).toString();
  return currency ? money(v, currency) : String(Number(v));
}

export default async function PriceHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const { adminNames } = await getLookups();
  const page = Math.max(1, Number(sp.page) || 1);

  let query = supabase
    .from("price_history")
    .select("*", { count: "exact" })
    .order("changed_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.kind) query = query.eq("kind", sp.kind);
  if (sp.q) query = query.ilike("subject", `%${sp.q}%`);
  if (sp.from) query = query.gte("changed_at", `${sp.from}T00:00:00Z`);
  if (sp.to) query = query.lte("changed_at", `${sp.to}T23:59:59Z`);
  const { data, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (n: number) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "page" && v) as [string, string][]);
    p.set("page", String(n));
    return `?${p.toString()}`;
  };

  return (
    <>
      <PageHeader title="Price history" description="Every change to selling prices, buying prices, deductions and exchange rates, with date, author and note." />
      <form method="get" className="mb-6 grid gap-3 sm:grid-cols-5">
        <Select name="kind" defaultValue={sp.kind ?? ""} aria-label="Type">
          <option value="">All changes</option>
          <option value="sell">Selling prices</option>
          <option value="buy">Buying prices</option>
          <option value="rule">Deductions</option>
          <option value="rate">Exchange rates</option>
        </Select>
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Model or inventory ID" aria-label="Search" />
        <Input name="from" type="date" defaultValue={sp.from ?? ""} aria-label="From" />
        <Input name="to" type="date" defaultValue={sp.to ?? ""} aria-label="To" />
        <button type="submit" className={buttonClass("outline", "md")}>
          Filter
        </button>
      </form>

      {data?.length ? (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Type</th>
                <th className={th}>Subject</th>
                <th className={th}>Field</th>
                <th className={th}>Old</th>
                <th className={th}>New</th>
                <th className={th}>Note</th>
                <th className={th}>By</th>
              </tr>
            </thead>
            <tbody>
              {data.map((h) => (
                <tr key={h.id}>
                  <td className={`${td} whitespace-nowrap`}>{dateTime(h.changed_at)}</td>
                  <td className={td}>{KIND[h.kind]}</td>
                  <td className={td}>
                    {h.product_id ? (
                      <Link className="hover:underline" href={`/admin/inventory/${h.product_id}`}>
                        {h.subject}
                      </Link>
                    ) : (
                      h.subject
                    )}
                  </td>
                  <td className={`${td} text-grey`}>{h.field.replace(/_/g, " ")}</td>
                  <td className={td}>{value(h.old_value, h.field, h.currency)}</td>
                  <td className={td}>{value(h.new_value, h.field, h.currency)}</td>
                  <td className={`${td} text-grey`}>{h.note ?? ""}</td>
                  <td className={`${td} text-grey`}>{h.changed_by ? adminNames[h.changed_by] ?? "" : "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No changes found.</Empty>
      )}

      {pages > 1 ? (
        <div className="mt-6 flex items-center gap-3 text-sm">
          {page > 1 ? <Link className={buttonClass("outline", "sm")} href={qs(page - 1)}>Previous</Link> : null}
          <span className="text-grey">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link className={buttonClass("outline", "sm")} href={qs(page + 1)}>Next</Link> : null}
        </div>
      ) : null}
    </>
  );
}
