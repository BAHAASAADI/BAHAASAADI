import Link from "next/link";
import { updateSellPrice } from "@/app/admin/actions/pricing";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { CONDITION_LABEL, Empty, PageHeader, ProductStatusBadge, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Notice, Select } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";
import { formatStorage } from "@/lib/format";
import type { Product } from "@/lib/types";

export const metadata = { title: "Selling prices" };

const cellInput = "w-28 rounded-lg border border-line bg-black px-2 py-1.5 text-sm focus:border-white focus:outline-none";

export default async function SellingPricesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, admin } = await requireAdmin();
  const sp = await searchParams;
  const { shops, shopById, models, modelById } = await getLookups();
  const canEdit = hasRole(admin.role, "manager");

  let query = supabase.from("products").select("*").neq("status", "sold").order("model_id").order("storage_gb").limit(1000);
  if (sp.shop) query = query.eq("shop_id", sp.shop);
  if (sp.model) query = query.eq("model_id", sp.model);
  if (sp.offers === "1") query = query.not("offer_price", "is", null);
  const { data } = await query;
  const rows = ((data ?? []) as Product[]).sort(
    (a, b) => (modelById[b.model_id]?.sort_order ?? 0) - (modelById[a.model_id]?.sort_order ?? 0) || a.storage_gb - b.storage_gb,
  );

  return (
    <>
      <PageHeader
        title="Selling prices"
        description="Prices of phones available in your shops. Each phone keeps its own price in its shop's currency. Every change is saved in the price history."
        actions={
          canEdit ? (
            <Link href="/admin/market" className={buttonClass("primary", "md")}>
              Bulk / market update
            </Link>
          ) : null
        }
      />
      {!canEdit ? (
        <div className="mb-6">
          <Notice>Only owners and managers can change selling prices.</Notice>
        </div>
      ) : null}

      <form method="get" className="mb-6 grid gap-3 sm:grid-cols-4">
        <Select name="shop" defaultValue={sp.shop ?? ""} aria-label="Shop">
          <option value="">All shops</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select name="model" defaultValue={sp.model ?? ""} aria-label="Model">
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select name="offers" defaultValue={sp.offers ?? ""} aria-label="Offers">
          <option value="">All phones</option>
          <option value="1">Special offers only</option>
        </Select>
        <button className={buttonClass("outline", "md")} type="submit">
          Filter
        </button>
      </form>

      {rows.length ? (
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Phone</th>
                <th className={th}>Shop</th>
                <th className={th}>Status</th>
                <th className={th}>Price · Offer · Note</th>
                <th className={th}>Last change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    <Link href={`/admin/inventory/${p.id}`} className="hover:underline">
                      <span className="block font-medium">
                        {modelById[p.model_id]?.name} {formatStorage(p.storage_gb)}
                      </span>
                      <span className="block text-xs text-grey">
                        {p.inventory_id} · {p.color} · {CONDITION_LABEL[p.condition]} · {p.battery_health ?? "—"}%
                      </span>
                    </Link>
                  </td>
                  <td className={td}>{shopById[p.shop_id]?.name}</td>
                  <td className={td}>
                    <ProductStatusBadge status={p.status} />
                  </td>
                  <td className={td}>
                    {canEdit ? (
                      <ActionForm action={updateSellPrice} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input className={cellInput} name="price" type="number" min={0} step="0.01" defaultValue={p.price} aria-label="Price" required />
                        <input className={cellInput} name="offer_price" type="number" min={0} step="0.01" defaultValue={p.offer_price ?? ""} placeholder="offer" aria-label="Offer price" />
                        <span className="text-xs text-grey">{p.currency}</span>
                        <input className="w-32 rounded-lg border border-line bg-black px-2 py-1.5 text-sm" name="note" placeholder="note" aria-label="Note" />
                        <SubmitButton size="sm" variant="outline">
                          Save
                        </SubmitButton>
                      </ActionForm>
                    ) : (
                      <span>
                        {money(p.price, p.currency)}
                        {p.offer_price != null ? ` · offer ${money(p.offer_price, p.currency)}` : ""}
                      </span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-xs text-grey`}>{dateTime(p.price_updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No phones in stock match these filters.</Empty>
      )}
    </>
  );
}
