import Link from "next/link";
import { Plus } from "lucide-react";
import { Empty, PageHeader, ProductStatusBadge, table, tableWrap, td, th, CONDITION_LABEL } from "@/components/admin/ui";
import { buttonClass, Input, Notice, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getLookups, money, dateTime } from "@/lib/admin/data";
import { publicPhotoUrl } from "@/lib/env";
import { formatStorage } from "@/lib/format";
import { CONDITIONS, type Product } from "@/lib/types";

export const metadata = { title: "Inventory" };

type Row = Product & { photos: { path: string; sort_order: number }[] };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const { shops, shopById, models, modelById } = await getLookups();
  const status = sp.status ?? "in_stock";

  let query = supabase.from("products").select("*, photos:product_photos(path,sort_order)").order("created_at", { ascending: false }).limit(1000);
  if (status === "in_stock") query = query.in("status", ["available", "reserved"]);
  else if (status !== "all") query = query.eq("status", status);
  if (sp.shop) query = query.eq("shop_id", sp.shop);
  if (sp.model) query = query.eq("model_id", sp.model);
  if (sp.condition) query = query.eq("condition", sp.condition);
  const { data, error } = await query;
  let rows = (data ?? []) as Row[];

  if (sp.q) {
    const q = sp.q.toLowerCase().trim();
    let imeiMatches = new Set<string>();
    if (/^\d{4,}$/.test(q)) {
      const { data: priv } = await supabase.from("product_private").select("product_id").ilike("imei", `%${q}%`);
      imeiMatches = new Set((priv ?? []).map((p) => p.product_id));
    }
    rows = rows.filter(
      (p) =>
        imeiMatches.has(p.id) ||
        [p.inventory_id, modelById[p.model_id]?.name, p.color, formatStorage(p.storage_gb)].join(" ").toLowerCase().includes(q),
    );
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Every phone across all shops. Sold phones are hidden from the website automatically."
        actions={
          <Link href="/admin/inventory/new" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" /> Add phone
          </Link>
        }
      />

      <form className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.3fr_1.2fr_1fr_1fr_1fr_auto]" method="get">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search ID, model, colour, IMEI" aria-label="Search" />
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="in_stock">In stock (available + reserved)</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
          <option value="all">All</option>
        </Select>
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
        <Select name="condition" defaultValue={sp.condition ?? ""} aria-label="Condition">
            <option value="">Any condition</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
        </Select>
        <button className={buttonClass("outline", "md")} type="submit">
          Filter
        </button>
      </form>

      {sp.deleted ? (
        <div className="mb-6">
          <Notice tone="success">Phone {sp.deleted} deleted.</Notice>
        </div>
      ) : null}
      {error ? <Empty>Could not load inventory: {error.message}</Empty> : null}
      <p className="mb-3 text-sm text-grey">{rows.length} phone(s)</p>

      {rows.length ? (
        <ul className="space-y-3 md:hidden">
          {rows.map((p) => {
            const cover = [...p.photos].sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <li key={p.id}>
                <Link href={`/admin/inventory/${p.id}`} className="flex gap-3 rounded-2xl border border-line p-3">
                  <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-black">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={publicPhotoUrl(cover.path)} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        {modelById[p.model_id]?.name} {formatStorage(p.storage_gb)}
                      </span>
                      <ProductStatusBadge status={p.status} />
                    </span>
                    <span className="block text-xs text-grey">
                      {p.inventory_id} · {p.color} · {CONDITION_LABEL[p.condition]} · {p.battery_health ?? "—"}%
                    </span>
                    <span className="mt-1 block text-sm">
                      {money(p.offer_price ?? p.price, p.currency)} <span className="text-xs text-grey">· {shopById[p.shop_id]?.name}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {rows.length ? (
        <div className={`${tableWrap} hidden md:block`}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Phone</th>
                <th className={th}>Battery</th>
                <th className={th}>Condition</th>
                <th className={th}>Price</th>
                <th className={th}>Shop</th>
                <th className={th}>Status</th>
                <th className={th}>Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const cover = [...p.photos].sort((a, b) => a.sort_order - b.sort_order)[0];
                return (
                  <tr key={p.id}>
                    <td className={td}>
                      <Link href={`/admin/inventory/${p.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line bg-black">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={publicPhotoUrl(cover.path)} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <span>
                          <span className="block font-medium">
                            {modelById[p.model_id]?.name} {formatStorage(p.storage_gb)}
                          </span>
                          <span className="block text-xs text-grey">
                            {p.inventory_id} · {p.color}
                            {!p.is_published ? " · hidden" : ""}
                            {p.is_featured ? " · featured" : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={td}>{p.battery_health != null ? `${p.battery_health}%` : "—"}</td>
                    <td className={td}>{CONDITION_LABEL[p.condition]}</td>
                    <td className={td}>
                      <span className="block">{money(p.offer_price ?? p.price, p.currency)}</span>
                      {p.offer_price != null ? <span className="text-xs text-muted line-through">{money(p.price, p.currency)}</span> : null}
                    </td>
                    <td className={td}>{shopById[p.shop_id]?.name ?? "—"}</td>
                    <td className={td}>
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className={`${td} whitespace-nowrap text-grey`}>{dateTime(p.created_at, false)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>
          No phones match these filters.{" "}
          <Link href="/admin/inventory/new" className="underline">
            Add a phone
          </Link>
        </Empty>
      )}
    </>
  );
}
