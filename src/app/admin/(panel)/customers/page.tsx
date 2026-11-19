import Link from "next/link";
import { Empty, PageHeader, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Input, Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime } from "@/lib/admin/data";

export const metadata = { title: "Customers" };

type Row = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
  enquiries: { count: number }[];
  requests: { count: number }[];
  sales: { count: number }[];
  purchases: { count: number }[];
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string }> }) {
  const { supabase } = await requireAdmin();
  const { q, deleted } = await searchParams;
  let query = supabase
    .from("customers")
    .select("id,name,phone,email,created_at, enquiries:trade_in_enquiries(count), requests:customer_requests(count), sales(count), purchases(count)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) {
    const term = q.replace(/[,()*]/g, " ").trim();
    query = query.or(`name.ilike.%${term}%,phone.ilike.%${term.replace(/\s/g, "")}%,email.ilike.%${term}%`);
  }
  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const n = (v: { count: number }[]) => v?.[0]?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who sent a trade-in enquiry, a reservation, a question or a message, and customers recorded on sales. Each customer is identified by telephone number."
      />
      {deleted ? (
        <div className="mb-6">
          <Notice tone="success">Customer deleted. Their enquiries, sales and purchases are kept.</Notice>
        </div>
      ) : null}
      <form method="get" className="mb-6 flex max-w-xl gap-3">
        <Input name="q" defaultValue={q ?? ""} placeholder="Name, telephone or email" aria-label="Search customers" />
        <button type="submit" className={buttonClass("outline", "md")}>
          Search
        </button>
      </form>
      {error ? <Empty>{error.message}</Empty> : null}
      {rows.length ? (
        <>
          <ul className="space-y-3 md:hidden">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/customers/${c.id}`} className="block rounded-2xl border border-line p-4">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-sm text-grey" dir="ltr">{c.phone}</span>
                  <span className="mt-2 block text-xs text-grey">
                    {n(c.enquiries)} trade-in · {n(c.requests)} requests · {n(c.sales)} bought · {n(c.purchases)} sold to us
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={`${tableWrap} hidden md:block`}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Customer</th>
                  <th className={th}>Telephone</th>
                  <th className={th}>Trade-ins</th>
                  <th className={th}>Requests</th>
                  <th className={th}>Phones bought</th>
                  <th className={th}>Phones sold to iZone</th>
                  <th className={th}>Since</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.email ? <span className="block text-xs text-grey">{c.email}</span> : null}
                    </td>
                    <td className={td} dir="ltr">{c.phone}</td>
                    <td className={td}>{n(c.enquiries)}</td>
                    <td className={td}>{n(c.requests)}</td>
                    <td className={td}>{n(c.sales)}</td>
                    <td className={td}>{n(c.purchases)}</td>
                    <td className={`${td} text-grey`}>{dateTime(c.created_at, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty>No customers yet. They appear here automatically when someone contacts iZone through the website.</Empty>
      )}
    </>
  );
}
