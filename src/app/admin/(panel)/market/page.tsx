import Link from "next/link";
import { bulkAdjustBuy, bulkAdjustSell } from "@/app/admin/actions/pricing";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { CONDITION_LABEL, PageHeader, Panel, table, tableWrap, td, th } from "@/components/admin/ui";
import { Field, Input, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";
import { CONDITIONS } from "@/lib/types";

export const metadata = { title: "Market updates" };

export default async function MarketPage() {
  const { supabase } = await requireAdmin("manager");
  const { shops, models, mainCurrency, adminNames } = await getLookups();

  const [{ data: buy }, { data: sell }, { data: history }] = await Promise.all([
    supabase.from("buy_prices").select("model_id, base_price, updated_at"),
    supabase.from("products").select("model_id, price_updated_at").neq("status", "sold"),
    supabase.from("price_history").select("*").in("kind", ["buy", "sell"]).order("changed_at", { ascending: false }).limit(15),
  ]);

  const summary = new Map<string, { buyCount: number; buyUpdated: string | null; minBuy: number | null; maxBuy: number | null; sellCount: number; sellUpdated: string | null }>();
  const get = (id: string) => summary.get(id) ?? { buyCount: 0, buyUpdated: null, minBuy: null, maxBuy: null, sellCount: 0, sellUpdated: null };
  for (const b of buy ?? []) {
    const s = get(b.model_id);
    s.buyCount++;
    s.buyUpdated = !s.buyUpdated || b.updated_at > s.buyUpdated ? b.updated_at : s.buyUpdated;
    s.minBuy = s.minBuy == null ? Number(b.base_price) : Math.min(s.minBuy, Number(b.base_price));
    s.maxBuy = s.maxBuy == null ? Number(b.base_price) : Math.max(s.maxBuy, Number(b.base_price));
    summary.set(b.model_id, s);
  }
  for (const p of sell ?? []) {
    const s = get(p.model_id);
    s.sellCount++;
    s.sellUpdated = !s.sellUpdated || p.price_updated_at > s.sellUpdated ? p.price_updated_at : s.sellUpdated;
    summary.set(p.model_id, s);
  }
  const rows = models.filter((m) => summary.has(m.id));

  return (
    <>
      <PageHeader
        title="Market updates"
        description="Adjust many prices at once when the market moves. Nothing changes automatically: every update is applied only when you submit it, and is recorded in the price history with your note."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Adjust buying prices" description={`Trade-in prices (what iZone pays), in ${mainCurrency}. Percentage and fixed changes also apply to explicit condition prices.`}>
          <ActionForm action={bulkAdjustBuy} className="space-y-4">
            <Field label="Models (none selected = all models)" htmlFor="buy-models">
              <select id="buy-models" name="model_ids" multiple className="h-40 w-full rounded-xl border border-line bg-black p-2 text-sm">
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Storages (none selected = all)" htmlFor="buy-storages">
              <select id="buy-storages" name="storages" multiple className="h-24 w-full rounded-xl border border-line bg-black p-2 text-sm">
                {[64, 128, 256, 512, 1024, 2048].map((gb) => (
                  <option key={gb} value={gb}>
                    {gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Change" htmlFor="buy-mode">
                <Select id="buy-mode" name="mode" defaultValue="percent">
                  <option value="percent">By percentage (±%)</option>
                  <option value="fixed">By amount (±)</option>
                  <option value="set">Set base price to</option>
                </Select>
              </Field>
              <Field label="Value" htmlFor="buy-value">
                <Input id="buy-value" name="value" type="number" step="0.01" required placeholder="-5" />
              </Field>
              <Field label="Round to" htmlFor="buy-round">
                <Input id="buy-round" name="round_to" type="number" min={0} step="0.01" placeholder="e.g. 5" />
              </Field>
            </div>
            <Field label="Note" htmlFor="buy-note">
              <Input id="buy-note" name="note" placeholder="e.g. Market down after new release" />
            </Field>
            <SubmitButton confirm="Apply this change to the selected buying prices?">Apply to buying prices</SubmitButton>
          </ActionForm>
        </Panel>

        <Panel title="Adjust selling prices" description="Prices of phones in stock (sold phones are never changed). Amounts are in each phone's own currency.">
          <ActionForm action={bulkAdjustSell} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Shop" htmlFor="sell-shop">
                <Select id="sell-shop" name="shop_id" defaultValue="">
                  <option value="">All shops</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.currency})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Model" htmlFor="sell-model">
                <Select id="sell-model" name="model_id" defaultValue="">
                  <option value="">All models</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Condition" htmlFor="sell-condition">
                <Select id="sell-condition" name="condition" defaultValue="">
                  <option value="">Any condition</option>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABEL[c]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" htmlFor="sell-status">
                <Select id="sell-status" name="status" defaultValue="">
                  <option value="">Available and reserved</option>
                  <option value="available">Available only</option>
                  <option value="reserved">Reserved only</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Change" htmlFor="sell-mode">
                <Select id="sell-mode" name="mode" defaultValue="percent">
                  <optgroup label="Selling price">
                    <option value="percent">Price: change by percentage (±%)</option>
                    <option value="fixed">Price: change by amount (±)</option>
                    <option value="set">Price: set to</option>
                  </optgroup>
                  <optgroup label="Special offer">
                    <option value="percent_off">Offer: % off the price</option>
                    <option value="fixed_off">Offer: amount off the price</option>
                    <option value="offer_set">Offer: set offer price to</option>
                    <option value="clear">Offer: remove offers</option>
                  </optgroup>
                </Select>
              </Field>
              <Field label="Value" htmlFor="sell-value">
                <Input id="sell-value" name="value" type="number" step="0.01" placeholder="e.g. -5 or 10" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <Field label="Round to" htmlFor="sell-round">
                <Input id="sell-round" name="round_to" type="number" min={0} step="0.01" placeholder="e.g. 10" />
              </Field>
              <Field label="Note" htmlFor="sell-note">
                <Input id="sell-note" name="note" placeholder="e.g. Weekend offer" />
              </Field>
            </div>
            <p className="text-xs text-muted">Offers always stay below the normal price; phones where the offer would not be lower are skipped.</p>
            <SubmitButton confirm="Apply this change to the matching phones?">Apply to selling prices</SubmitButton>
          </ActionForm>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel title="Last updated by model">
          {rows.length ? (
            <div className={tableWrap}>
              <table className={table}>
                <thead>
                  <tr>
                    <th className={th}>Model</th>
                    <th className={th}>Buying prices</th>
                    <th className={th}>Buying updated</th>
                    <th className={th}>In stock</th>
                    <th className={th}>Selling updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const s = summary.get(m.id)!;
                    return (
                      <tr key={m.id}>
                        <td className={td}>{m.name}</td>
                        <td className={td}>{s.buyCount ? `${money(s.minBuy, mainCurrency)} – ${money(s.maxBuy, mainCurrency)}` : "—"}</td>
                        <td className={`${td} text-grey`}>{dateTime(s.buyUpdated, false)}</td>
                        <td className={td}>{s.sellCount}</td>
                        <td className={`${td} text-grey`}>{dateTime(s.sellUpdated, false)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-grey">No prices yet.</p>
          )}
        </Panel>
        <Panel title="Recent changes" actions={<Link href="/admin/price-history" className="text-xs text-grey hover:text-white">Full history</Link>}>
          <ul className="divide-y divide-line text-sm">
            {(history ?? []).map((h) => (
              <li key={h.id} className="py-2.5">
                <span className="block">
                  {h.subject} <span className="text-grey">· {h.kind === "buy" ? "buying" : "selling"} {h.field.replace("_", " ")}</span>
                </span>
                <span className="block text-xs text-grey">
                  {money(h.old_value, h.currency ?? mainCurrency)} → {money(h.new_value, h.currency ?? mainCurrency)} · {dateTime(h.changed_at)}
                  {h.note ? ` · ${h.note}` : ""}
                  {h.changed_by && adminNames[h.changed_by] ? ` · ${adminNames[h.changed_by]}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
