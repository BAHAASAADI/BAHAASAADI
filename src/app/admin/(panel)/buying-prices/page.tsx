import Link from "next/link";
import { saveBands, saveBuyPrices, saveMinOffer, saveRules } from "@/app/admin/actions/pricing";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel, table, tableWrap, td, th } from "@/components/admin/ui";
import { buttonClass, Input, Notice } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";
import { formatStorage } from "@/lib/format";
import type { BatteryBand, BuyPrice, TradeInRule } from "@/lib/types";

export const metadata = { title: "Buying prices" };

const cellInput = "w-24 rounded-lg border border-line bg-black px-2 py-1.5 text-sm focus:border-white focus:outline-none disabled:opacity-60";

export default async function BuyingPricesPage({ searchParams }: { searchParams: Promise<{ q?: string; open?: string }> }) {
  const { supabase, admin } = await requireAdmin();
  const { q, open } = await searchParams;
  const { models, mainCurrency, settings } = await getLookups();
  const canEdit = hasRole(admin.role, "manager");

  const [{ data: prices }, { data: rules }, { data: bands }] = await Promise.all([
    supabase.from("buy_prices").select("*"),
    supabase.from("trade_in_rules").select("*").order("sort_order"),
    supabase.from("battery_bands").select("*").order("min_pct", { ascending: false }),
  ]);
  const byModel = new Map<string, BuyPrice[]>();
  for (const p of (prices ?? []) as BuyPrice[]) byModel.set(p.model_id, [...(byModel.get(p.model_id) ?? []), p]);
  const list = models.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));
  const ruleGroups: { title: string; category: TradeInRule["category"] }[] = [
    { title: "Physical condition", category: "condition" },
    { title: "Technical defects", category: "defect" },
    { title: "Replaced components", category: "part" },
  ];
  const bandRows: (BatteryBand | { id: string; min_pct: string; max_pct: string; deduction_type: "percent"; value: string })[] = [
    ...((bands ?? []) as BatteryBand[]),
    { id: "new-1", min_pct: "", max_pct: "", deduction_type: "percent", value: "" },
  ];

  return (
    <>
      <PageHeader
        title="Buying prices"
        description={
          <>
            What iZone pays customers for used iPhones, in <strong className="text-white">{mainCurrency}</strong>. The base price is for a phone in like-new condition, fully working, with all original parts. The trade-in calculator subtracts the deductions below. Buying prices are completely separate from selling prices.
          </>
        }
        actions={
          <>
            {canEdit ? (
              <Link href="/admin/market" className={buttonClass("outline", "md")}>
                Bulk / market update
              </Link>
            ) : null}
            <Link href="/en/sell" target="_blank" className={buttonClass("outline", "md")}>
              Test the calculator ↗
            </Link>
          </>
        }
      />
      {!canEdit ? (
        <div className="mb-6">
          <Notice>You can view buying prices. Only owners and managers can change them.</Notice>
        </div>
      ) : null}

      <Panel title="Price list by model" description="Leave a base price empty if you do not want to show an online offer for that storage. Condition prices are optional: when empty, the general condition deduction applies.">
        <form method="get" className="mb-4 flex max-w-md gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Find a model" aria-label="Find a model" />
          <button className={buttonClass("outline", "md")} type="submit">
            Find
          </button>
        </form>
        <div className="divide-y divide-line rounded-2xl border border-line">
          {list.map((m) => {
            const rows = byModel.get(m.id) ?? [];
            const priced = rows.filter((r) => r.is_active);
            const latest = rows.reduce<string | null>((acc, r) => (!acc || r.updated_at > acc ? r.updated_at : acc), null);
            const values = priced.map((r) => Number(r.base_price));
            return (
              <details key={m.id} className="group" open={open === m.id || (!!q && list.length <= 3)}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-panel">
                  <span className="font-medium">
                    {m.name}
                    {!m.is_active ? <span className="ms-2 text-xs text-muted">(hidden model)</span> : null}
                  </span>
                  <span className="text-sm text-grey">
                    {priced.length ? `${money(Math.min(...values), mainCurrency)} – ${money(Math.max(...values), mainCurrency)}` : "No online price"} · {priced.length}/{m.storages.length} priced
                    {latest ? ` · updated ${dateTime(latest, false)}` : ""}
                  </span>
                </summary>
                <div className="border-t border-line p-4">
                  <ActionForm action={saveBuyPrices}>
                    <input type="hidden" name="model_id" value={m.id} />
                    <div className={tableWrap}>
                      <table className={table}>
                        <thead>
                          <tr>
                            <th className={th}>Storage</th>
                            <th className={th}>Base (like new)</th>
                            <th className={th}>Excellent</th>
                            <th className={th}>Good</th>
                            <th className={th}>Fair</th>
                            <th className={th}>Damaged</th>
                            <th className={th}>Online</th>
                            <th className={th}>Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m.storages.map((gb) => {
                            const r = rows.find((x) => x.storage_gb === gb);
                            return (
                              <tr key={gb}>
                                <td className={td}>
                                  {formatStorage(gb)}
                                  <input type="hidden" name="storage" value={gb} />
                                </td>
                                <td className={td}>
                                  <input className={cellInput} name={`base_${gb}`} type="number" min={0} step="0.01" defaultValue={r?.base_price ?? ""} disabled={!canEdit} aria-label={`${m.name} ${formatStorage(gb)} base price`} />
                                </td>
                                {(["excellent", "good", "fair", "damaged"] as const).map((c) => (
                                  <td key={c} className={td}>
                                    <input className={cellInput} name={`${c}_${gb}`} type="number" min={0} step="0.01" defaultValue={r?.[`price_${c}`] ?? ""} placeholder="auto" disabled={!canEdit} aria-label={`${formatStorage(gb)} ${c} price`} />
                                  </td>
                                ))}
                                <td className={td}>
                                  <input type="checkbox" name={`active_${gb}`} defaultChecked={r ? r.is_active : true} disabled={!canEdit} className="h-4 w-4 accent-white" aria-label="Show online" />
                                </td>
                                <td className={`${td} whitespace-nowrap text-xs text-grey`}>{r ? dateTime(r.updated_at) : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {canEdit ? (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <Input name="note" placeholder="Note for the history (optional)" className="max-w-sm" />
                        <SubmitButton>Save {m.name}</SubmitButton>
                      </div>
                    ) : null}
                  </ActionForm>
                </div>
              </details>
            );
          })}
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Deductions" description="Percent deductions are calculated on the base price. Fixed amounts are in the main currency.">
          <ActionForm action={saveRules}>
            {ruleGroups.map((g) => (
              <div key={g.category} className="mb-6">
                <h3 className="mb-2 text-sm font-semibold">{g.title}</h3>
                <div className="divide-y divide-line rounded-xl border border-line">
                  {((rules ?? []) as TradeInRule[])
                    .filter((r) => r.category === g.category)
                    .map((r) => (
                      <div key={r.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                        <input type="hidden" name="key" value={r.key} />
                        <span className="min-w-40 flex-1">{r.label}</span>
                        <span className="flex items-center gap-2">
                          <select name={`type_${r.key}`} defaultValue={r.deduction_type} disabled={!canEdit} className="rounded-lg border border-line bg-black px-2 py-1.5 text-sm" aria-label={`${r.label} type`}>
                            <option value="percent">%</option>
                            <option value="fixed">{mainCurrency}</option>
                          </select>
                          <input name={`value_${r.key}`} type="number" min={0} step="0.01" defaultValue={r.value} disabled={!canEdit} className={cellInput} aria-label={`${r.label} value`} />
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-3">
                <Input name="note" placeholder="Note (optional)" className="max-w-xs" />
                <SubmitButton>Save deductions</SubmitButton>
              </div>
            ) : null}
          </ActionForm>
        </Panel>

        <div className="space-y-6">
          <Panel title="Battery health" description="Deduction applied to the base price for each battery health band. Bands must cover 0–100%. Tick “remove” to delete a band; fill the empty row to add one.">
            <ActionForm action={saveBands}>
              <div className="divide-y divide-line rounded-xl border border-line">
                {bandRows.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <input type="hidden" name="band" value={b.id} />
                    <input name={`min_${b.id}`} type="number" min={0} max={100} defaultValue={b.min_pct} disabled={!canEdit} className="w-16 rounded-lg border border-line bg-black px-2 py-1.5" aria-label="From %" placeholder="from" />
                    <span className="text-grey">–</span>
                    <input name={`max_${b.id}`} type="number" min={0} max={100} defaultValue={b.max_pct} disabled={!canEdit} className="w-16 rounded-lg border border-line bg-black px-2 py-1.5" aria-label="To %" placeholder="to" />
                    <span className="text-grey">%</span>
                    <select name={`type_${b.id}`} defaultValue={b.deduction_type} disabled={!canEdit} className="ms-auto rounded-lg border border-line bg-black px-2 py-1.5" aria-label="Deduction type">
                      <option value="percent">%</option>
                      <option value="fixed">{mainCurrency}</option>
                    </select>
                    <input name={`value_${b.id}`} type="number" min={0} step="0.01" defaultValue={b.value} disabled={!canEdit} className={cellInput} aria-label="Deduction" placeholder="deduction" />
                    {!b.id.startsWith("new") && canEdit ? (
                      <label className="flex items-center gap-1 text-xs text-grey">
                        <input type="checkbox" name={`delete_${b.id}`} className="accent-white" /> remove
                      </label>
                    ) : null}
                  </div>
                ))}
              </div>
              {canEdit ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Input name="note" placeholder="Note (optional)" className="max-w-xs" />
                  <SubmitButton>Save battery bands</SubmitButton>
                </div>
              ) : null}
            </ActionForm>
          </Panel>

          <Panel title="Minimum offer" description="The calculator never shows an estimate below this amount (0 = no minimum).">
            <ActionForm action={saveMinOffer} className="flex flex-wrap items-center gap-3">
              <Input name="trade_in_min_offer" type="number" min={0} step="0.01" defaultValue={settings?.trade_in_min_offer ?? 0} className="max-w-40" disabled={!hasRole(admin.role, "owner")} aria-label="Minimum offer" />
              <span className="text-sm text-grey">{mainCurrency}</span>
              {hasRole(admin.role, "owner") ? <SubmitButton variant="outline">Save</SubmitButton> : <span className="text-xs text-muted">Owner only</span>}
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
