import Link from "next/link";
import { CONDITION_LABEL, Empty, EnquiryStatusBadge, enquiryStatusLabel, PageHeader, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Input, Notice, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";
import { formatStorage } from "@/lib/format";
import { ENQUIRY_STATUSES, type TradeInEnquiry } from "@/lib/types";

export const metadata = { title: "Trade-in enquiries" };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const { shops, shopById } = await getLookups();
  const status = sp.status ?? "open";

  let query = supabase.from("trade_in_enquiries").select("*, photos:trade_in_photos(count)").order("created_at", { ascending: false }).limit(500);
  if (status === "open") query = query.in("status", ["new", "contacted", "negotiating", "accepted"]);
  else if (status !== "all") query = query.eq("status", status);
  if (sp.shop) query = query.eq("preferred_shop_id", sp.shop);
  if (sp.q) query = query.or(`customer_name.ilike.%${sp.q.replace(/[,()]/g, " ")}%,customer_phone.ilike.%${sp.q.replace(/[,()]/g, " ")}%,reference.ilike.%${sp.q.replace(/[,()]/g, " ")}%,model_name.ilike.%${sp.q.replace(/[,()]/g, " ")}%`);
  const { data, error } = await query;
  const rows = (data ?? []) as (TradeInEnquiry & { photos: { count: number }[] })[];

  return (
    <>
      <PageHeader title="Trade-in enquiries" description="Customers who want to sell their iPhone. The estimate is calculated by the server from your buying prices; you can set a final offer after inspection." />
      <form method="get" className="mb-6 grid gap-3 sm:grid-cols-4">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Name, telephone, reference, model" aria-label="Search" />
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="open">Open (new → accepted)</option>
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {enquiryStatusLabel[s]}
            </option>
          ))}
          <option value="all">All</option>
        </Select>
        <Select name="shop" defaultValue={sp.shop ?? ""} aria-label="Preferred shop">
          <option value="">All shops</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass("outline", "md")}>
          Filter
        </button>
      </form>
      {sp.deleted ? (
        <div className="mb-6">
          <Notice tone="success">Enquiry deleted.</Notice>
        </div>
      ) : null}
      {error ? <Empty>{error.message}</Empty> : null}
      {rows.length ? (
        <ul className="space-y-3 md:hidden">
          {rows.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/enquiries/${e.id}`} className="block rounded-2xl border border-line p-4">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium">
                    {e.model_name} {formatStorage(e.storage_gb)}
                  </span>
                  <EnquiryStatusBadge status={e.status} />
                </span>
                <span className="block text-xs text-grey">
                  {e.reference} · {dateTime(e.created_at)} · {CONDITION_LABEL[e.condition]} · {e.battery_health ?? "—"}%
                </span>
                <span className="mt-2 block text-sm">
                  {e.customer_name} <span className="text-grey" dir="ltr">{e.customer_phone}</span>
                </span>
                <span className="mt-1 block text-sm">
                  {e.final_offer != null ? `Final ${money(e.final_offer, e.final_currency ?? e.currency)}` : e.estimated_offer != null ? `Estimate ${money(e.estimated_offer, e.currency)}` : "No online price"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {rows.length ? (
        <div className={`${tableWrap} hidden md:block`}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Enquiry</th>
                <th className={th}>Customer</th>
                <th className={th}>iPhone</th>
                <th className={th}>Battery</th>
                <th className={th}>Estimate</th>
                <th className={th}>Final offer</th>
                <th className={th}>Shop</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className={td}>
                    <Link href={`/admin/enquiries/${e.id}`} className="font-mono hover:underline">
                      {e.reference}
                    </Link>
                    <span className="block text-xs text-grey">{dateTime(e.created_at)}</span>
                  </td>
                  <td className={td}>
                    {e.customer_name}
                    <span className="block text-xs text-grey" dir="ltr">
                      {e.customer_phone}
                    </span>
                  </td>
                  <td className={td}>
                    {e.model_name} {formatStorage(e.storage_gb)}
                    <span className="block text-xs text-grey">
                      {CONDITION_LABEL[e.condition]}
                      {e.photos?.[0]?.count ? ` · ${e.photos[0].count} photo(s)` : ""}
                    </span>
                  </td>
                  <td className={td}>{e.battery_health ?? "—"}%</td>
                  <td className={td}>{e.estimated_offer != null ? money(e.estimated_offer, e.currency) : <span className="text-grey">No price</span>}</td>
                  <td className={td}>{e.final_offer != null ? money(e.final_offer, e.final_currency ?? e.currency) : "—"}</td>
                  <td className={td}>{e.preferred_shop_id ? shopById[e.preferred_shop_id]?.name : "Any"}</td>
                  <td className={td}>
                    <EnquiryStatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No enquiries.</Empty>
      )}
    </>
  );
}
