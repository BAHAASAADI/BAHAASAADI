import Link from "next/link";
import { reverseSale } from "@/app/admin/actions/inventory";
import { ActionButton } from "@/components/admin/forms";
import { Empty, PageHeader, StatCard, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Input, Select } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money, resolvePeriod } from "@/lib/admin/data";

export const metadata = { title: "Sales & purchases" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, admin } = await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "purchases" ? "purchases" : "sales";
  const { shops, shopById, mainCurrency } = await getLookups();
  const period = resolvePeriod(sp.period ?? "month", sp.from, sp.to);
  const isManager = hasRole(admin.role, "manager");

  const exportQuery = new URLSearchParams(Object.entries({ type: tab, shop: sp.shop ?? "", period: period.key, from: sp.from ?? "", to: sp.to ?? "" }).filter(([, v]) => v));

  let sales: Record<string, any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  let purchases: Record<string, any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (tab === "sales") {
    let q = supabase.from("sales").select("*").order("sold_at", { ascending: false }).limit(1000);
    if (sp.shop) q = q.eq("shop_id", sp.shop);
    if (period.from) q = q.gte("sold_at", period.from);
    if (period.to) q = q.lt("sold_at", period.to);
    sales = (await q).data ?? [];
  } else {
    let q = supabase.from("purchases").select("*").order("purchased_at", { ascending: false }).limit(1000);
    if (sp.shop) q = q.eq("shop_id", sp.shop);
    if (period.from) q = q.gte("purchased_at", period.from);
    if (period.to) q = q.lt("purchased_at", period.to);
    purchases = (await q).data ?? [];
  }
  const sum = (rows: Record<string, unknown>[], key: string) => rows.reduce((n, r) => n + Number(r[key] ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Sales & purchases"
        description={`Every transaction is recorded permanently. Totals are in ${mainCurrency} at the exchange rate of the transaction date.`}
        actions={
          <a href={`/admin/export?${exportQuery.toString()}`} className={buttonClass("outline", "md")}>
            Export CSV
          </a>
        }
      />
      <div className="mb-6 flex gap-2">
        {(["sales", "purchases"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/transactions?${new URLSearchParams({ ...(sp as Record<string, string>), tab: t }).toString()}`}
            className={`rounded-full px-4 py-2 text-sm ${tab === t ? "bg-white text-black" : "border border-line text-grey hover:text-white"}`}
          >
            {t === "sales" ? "Sales" : "Purchases"}
          </Link>
        ))}
      </div>
      <form method="get" className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
        <input type="hidden" name="tab" value={tab} />
        <Select name="shop" defaultValue={sp.shop ?? ""} aria-label="Shop">
          <option value="">All shops</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
        <Input type="date" name="from" defaultValue={sp.from ?? ""} aria-label="From" />
        <Input type="date" name="to" defaultValue={sp.to ?? ""} aria-label="To" />
        <button type="submit" className={buttonClass("outline", "md")}>
          Apply
        </button>
      </form>

      {tab === "sales" ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Phones sold" value={sales.length} hint={period.label} />
            <StatCard label="Revenue" value={money(sum(sales, "price_main"), mainCurrency, 0)} />
            <StatCard label="Cost of phones sold" value={money(sum(sales, "cost_main"), mainCurrency, 0)} />
            <StatCard label="Gross profit" value={money(sum(sales, "profit_main"), mainCurrency, 0)} hint={sales.some((s) => s.cost_main == null) ? "Some sales have no recorded cost" : undefined} />
          </div>
          {sales.length ? (
            <ul className="space-y-3 md:hidden">
              {sales.map((s) => (
                <li key={s.id} className="rounded-2xl border border-line p-4 text-sm">
                  <span className="flex justify-between gap-3">
                    <span className="font-medium">{s.description}</span>
                    <span>{money(s.price, s.currency)}</span>
                  </span>
                  <span className="block text-xs text-grey">
                    {s.inventory_id} · {dateTime(s.sold_at, false)} · {s.shop_id ? shopById[s.shop_id]?.name : ""}
                  </span>
                  <span className="mt-1 block text-xs">
                    Profit {s.profit_main != null ? money(s.profit_main, mainCurrency) : "unknown"}
                    {s.customer_name ? ` · ${s.customer_name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {sales.length ? (
            <div className={`${tableWrap} hidden md:block`}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Phone</th>
                    <th className={th}>Shop</th>
                    <th className={th}>Selling price</th>
                    <th className={th}>Cost ({mainCurrency})</th>
                    <th className={th}>Gross profit</th>
                    <th className={th}>Customer</th>
                    {isManager ? <th className={th}></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td className={`${td} whitespace-nowrap`}>{dateTime(s.sold_at, false)}</td>
                      <td className={td}>
                        {s.product_id ? (
                          <Link href={`/admin/inventory/${s.product_id}`} className="hover:underline">
                            {s.description}
                          </Link>
                        ) : (
                          s.description
                        )}
                        <span className="block font-mono text-xs text-grey">{s.inventory_id}</span>
                      </td>
                      <td className={td}>{s.shop_id ? shopById[s.shop_id]?.name : "—"}</td>
                      <td className={td}>
                        {money(s.price, s.currency)}
                        {s.currency !== mainCurrency ? <span className="block text-xs text-grey">{money(s.price_main, mainCurrency)}</span> : null}
                      </td>
                      <td className={td}>{money(s.cost_main, mainCurrency)}</td>
                      <td className={td}>{s.profit_main != null ? money(s.profit_main, mainCurrency) : <span className="text-grey">Unknown</span>}</td>
                      <td className={td}>
                        {s.customer_name ?? "—"}
                        {s.customer_phone ? <span className="block text-xs text-grey">{s.customer_phone}</span> : null}
                      </td>
                      {isManager ? (
                        <td className={td}>
                          <ActionButton action={reverseSale} fields={{ sale_id: s.id, product_id: s.product_id ?? "" }} variant="ghost" confirm="Reverse this sale? The phone returns to stock.">
                            Reverse
                          </ActionButton>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No sales in this period.</Empty>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Phones bought" value={purchases.length} hint={period.label} />
            <StatCard label="Total paid" value={money(sum(purchases, "price_main"), mainCurrency, 0)} />
            <StatCard label="From trade-ins" value={purchases.filter((p) => p.source === "trade_in").length} />
            <StatCard label="From suppliers" value={purchases.filter((p) => p.source === "supplier").length} />
          </div>
          {purchases.length ? (
            <ul className="space-y-3 md:hidden">
              {purchases.map((p) => (
                <li key={p.id} className="rounded-2xl border border-line p-4 text-sm">
                  <span className="flex justify-between gap-3">
                    <span className="font-medium">{p.description}</span>
                    <span>{money(p.price, p.currency)}</span>
                  </span>
                  <span className="block text-xs text-grey">
                    {p.inventory_id} · {dateTime(p.purchased_at, false)} · {p.source === "trade_in" ? "Trade-in" : p.source === "customer" ? "Customer" : "Supplier"}
                    {p.counterparty_name ? ` · ${p.counterparty_name}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {purchases.length ? (
            <div className={`${tableWrap} hidden md:block`}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Phone</th>
                    <th className={th}>Shop</th>
                    <th className={th}>Source</th>
                    <th className={th}>Supplier / customer</th>
                    <th className={th}>Purchase price</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id}>
                      <td className={`${td} whitespace-nowrap`}>{dateTime(p.purchased_at, false)}</td>
                      <td className={td}>
                        {p.product_id ? (
                          <Link href={`/admin/inventory/${p.product_id}`} className="hover:underline">
                            {p.description}
                          </Link>
                        ) : (
                          p.description
                        )}
                        <span className="block font-mono text-xs text-grey">{p.inventory_id}</span>
                      </td>
                      <td className={td}>{p.shop_id ? shopById[p.shop_id]?.name : "—"}</td>
                      <td className={td}>
                        {p.source === "trade_in" ? (
                          p.enquiry_id ? (
                            <Link href={`/admin/enquiries/${p.enquiry_id}`} className="underline">
                              Trade-in
                            </Link>
                          ) : (
                            "Trade-in"
                          )
                        ) : p.source === "customer" ? (
                          "Customer"
                        ) : (
                          "Supplier"
                        )}
                      </td>
                      <td className={td}>
                        {p.counterparty_name ?? "—"}
                        {p.counterparty_phone ? <span className="block text-xs text-grey">{p.counterparty_phone}</span> : null}
                      </td>
                      <td className={td}>
                        {money(p.price, p.currency)}
                        {p.currency !== mainCurrency ? <span className="block text-xs text-grey">{money(p.price_main, mainCurrency)}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No purchases in this period.</Empty>
          )}
        </>
      )}
    </>
  );
}
