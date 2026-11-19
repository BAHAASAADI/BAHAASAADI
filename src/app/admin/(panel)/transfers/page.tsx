import Link from "next/link";
import { Empty, PageHeader, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups } from "@/lib/admin/data";

export const metadata = { title: "Transfers" };

export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const { supabase } = await requireAdmin();
  const { shop: rawShop } = await searchParams;
  const shop = rawShop && /^[0-9a-f-]{36}$/i.test(rawShop) ? rawShop : undefined;
  const { shops, shopById, adminNames } = await getLookups();
  let q = supabase.from("transfers").select("*").order("transferred_at", { ascending: false }).limit(500);
  if (shop) q = q.or(`from_shop_id.eq.${shop},to_shop_id.eq.${shop}`);
  const { data } = await q;

  return (
    <>
      <PageHeader title="Transfers" description="Phones moved between shops. To transfer a phone, open it in Inventory and use “Transfer to another shop”." />
      <form method="get" className="mb-6 flex gap-3">
        <Select name="shop" defaultValue={shop ?? ""} className="!w-auto" aria-label="Shop">
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
      {data?.length ? (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Phone</th>
                <th className={th}>From</th>
                <th className={th}>To</th>
                <th className={th}>Note</th>
                <th className={th}>By</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id}>
                  <td className={`${td} whitespace-nowrap`}>{dateTime(t.transferred_at)}</td>
                  <td className={td}>
                    <Link href={`/admin/inventory/${t.product_id}`} className="font-mono hover:underline">
                      {t.inventory_id}
                    </Link>
                  </td>
                  <td className={td}>{shopById[t.from_shop_id]?.name ?? "—"}</td>
                  <td className={td}>{shopById[t.to_shop_id]?.name ?? "—"}</td>
                  <td className={`${td} text-grey`}>{t.note ?? ""}</td>
                  <td className={`${td} text-grey`}>{adminNames[t.transferred_by] ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No transfers yet.</Empty>
      )}
    </>
  );
}
