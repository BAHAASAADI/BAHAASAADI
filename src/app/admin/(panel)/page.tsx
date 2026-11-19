import Link from "next/link";
import { Check } from "lucide-react";
import { EnquiryStatusBadge, PageHeader, Panel, StatCard, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Input, Notice, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money, resolvePeriod } from "@/lib/admin/data";
import { formatStorage } from "@/lib/format";
import type { TradeInEnquiry } from "@/lib/types";

export const metadata = { title: "Overview" };

type Stats = {
  main_currency: string;
  in_stock: number;
  available: number;
  reserved: number;
  inventory_value: number;
  inventory_cost: number;
  sold: number;
  revenue: number;
  gross_profit: number;
  sales_without_cost: number;
  purchases: number;
  purchases_total: number;
  pending_enquiries: number;
  new_enquiries: number;
};

type ShopStat = {
  shop_id: string;
  shop_name: string;
  in_stock: number;
  available: number;
  reserved: number;
  inventory_value: number;
  sold: number;
  revenue: number;
  gross_profit: number;
  purchases: number;
  purchases_total: number;
};

export default async function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, admin } = await requireAdmin();
  const sp = await searchParams;
  const { shops, currencies, settings, mainCurrency } = await getLookups();
  const period = resolvePeriod(sp.period ?? "month", sp.from, sp.to);
  const shop = sp.shop || null;

  const [statsRes, shopStatsRes, enquiriesRes, buyCountRes, productCountRes] = await Promise.all([
    supabase.rpc("dashboard_stats", { p_shop: shop, p_from: period.from, p_to: period.to }),
    supabase.rpc("shop_stats", { p_from: period.from, p_to: period.to }),
    supabase.from("trade_in_enquiries").select("*").in("status", ["new", "contacted", "negotiating"]).order("created_at", { ascending: false }).limit(6),
    supabase.from("buy_prices").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);
  const s = (statsRes.data ?? {}) as Stats;
  const shopStats = (shopStatsRes.data ?? []) as ShopStat[];
  const enquiries = (enquiriesRes.data ?? []) as TradeInEnquiry[];
  const m = s.main_currency ?? mainCurrency;

  const checklist = [
    { done: shops.length > 0, label: "Add your shop (address, opening hours, WhatsApp, Google Maps)", href: "/admin/shops" },
    { done: !!settings?.whatsapp_number || shops.some((x) => x.whatsapp), label: "Set the WhatsApp number", href: "/admin/settings" },
    { done: currencies.every((c) => !c.is_active || c.confirmed_at), label: "Confirm exchange rates", href: "/admin/currencies" },
    { done: (buyCountRes.count ?? 0) > 0, label: "Set buying prices for the trade-in calculator", href: "/admin/buying-prices" },
    { done: (productCountRes.count ?? 0) > 0, label: "Add your first phone to stock", href: "/admin/inventory/new" },
  ];
  const setupDone = checklist.every((c) => c.done);

  return (
    <>
      <PageHeader
        title={`Hello${admin.full_name ? `, ${admin.full_name.split(" ")[0]}` : ""}`}
        description={`${period.label}${shop ? ` · ${shops.find((x) => x.id === shop)?.name ?? ""}` : " · All shops"}. Amounts in ${m}.`}
        actions={
          <Link href="/admin/inventory/new" className={buttonClass("primary", "md")}>
            Add phone
          </Link>
        }
      />

      {sp.denied ? (
        <div className="mb-6">
          <Notice tone="error">Your role does not have access to that page.</Notice>
        </div>
      ) : null}

      <form method="get" className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
        <Select name="shop" defaultValue={shop ?? ""} aria-label="Shop">
          <option value="">All shops</option>
          {shops.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </Select>
        <Select name="period" defaultValue={period.key} aria-label="Period">
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
          <option value="custom">Custom dates</option>
        </Select>
        <Input type="date" name="from" defaultValue={sp.from ?? ""} aria-label="From (custom)" />
        <Input type="date" name="to" defaultValue={sp.to ?? ""} aria-label="To (custom)" />
        <button type="submit" className={buttonClass("outline", "md")}>
          Apply
        </button>
      </form>

      {statsRes.error ? <Notice tone="error">Could not load statistics: {statsRes.error.message}</Notice> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Phones in stock" value={s.in_stock ?? 0} hint="Available + reserved" />
        <StatCard label="Available" value={s.available ?? 0} />
        <StatCard label="Reserved" value={s.reserved ?? 0} />
        <StatCard label="Sold" value={s.sold ?? 0} hint={period.label} />
        <StatCard label="Pending trade-ins" value={s.pending_enquiries ?? 0} hint={`${s.new_enquiries ?? 0} new`} />
        <StatCard label="Inventory value" value={money(s.inventory_value ?? 0, m, 0)} hint={`Cost ${money(s.inventory_cost ?? 0, m, 0)}`} />
        <StatCard label="Sales revenue" value={money(s.revenue ?? 0, m, 0)} hint={period.label} />
        <StatCard
          label="Estimated gross profit"
          value={money(s.gross_profit ?? 0, m, 0)}
          hint={s.sales_without_cost ? `${s.sales_without_cost} sale(s) without a recorded cost` : `Purchases ${money(s.purchases_total ?? 0, m, 0)}`}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="By shop" description={period.label}>
          {shopStats.length ? (
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>Shop</th>
                    <th className={th}>In stock</th>
                    <th className={th}>Inventory value</th>
                    <th className={th}>Sold</th>
                    <th className={th}>Revenue</th>
                    <th className={th}>Gross profit</th>
                    <th className={th}>Purchases</th>
                  </tr>
                </thead>
                <tbody>
                  {shopStats.map((r) => (
                    <tr key={r.shop_id}>
                      <td className={td}>
                        <Link href={`/admin?shop=${r.shop_id}&period=${period.key}`} className="hover:underline">
                          {r.shop_name}
                        </Link>
                      </td>
                      <td className={td}>
                        {r.in_stock} <span className="text-xs text-grey">({r.reserved} res.)</span>
                      </td>
                      <td className={td}>{money(r.inventory_value, m, 0)}</td>
                      <td className={td}>{r.sold}</td>
                      <td className={td}>{money(r.revenue, m, 0)}</td>
                      <td className={td}>{money(r.gross_profit, m, 0)}</td>
                      <td className={td}>
                        {r.purchases} · {money(r.purchases_total, m, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-grey">No shops yet.</p>
          )}
        </Panel>

        <div className="space-y-6">
          {!setupDone ? (
            <Panel title="Getting started">
              <ul className="space-y-3">
                {checklist.map((c) => (
                  <li key={c.label}>
                    <Link href={c.href} className="flex items-start gap-3 text-sm hover:underline">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${c.done ? "border-white bg-white text-black" : "border-line"}`}>
                        {c.done ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className={c.done ? "text-grey line-through" : ""}>{c.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Open trade-in enquiries" actions={<Link href="/admin/enquiries" className="text-xs text-grey hover:text-white">View all</Link>}>
            {enquiries.length ? (
              <ul className="divide-y divide-line">
                {enquiries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/enquiries/${e.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:underline">
                      <span>
                        <span className="block">{e.model_name} {formatStorage(e.storage_gb)}</span>
                        <span className="block text-xs text-grey">
                          {e.customer_name} · {dateTime(e.created_at)}
                        </span>
                      </span>
                      <span className="text-end">
                        <span className="block">{money(e.final_offer ?? e.estimated_offer, e.final_offer != null ? e.final_currency ?? e.currency : e.currency)}</span>
                        <EnquiryStatusBadge status={e.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-grey">No open enquiries.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
