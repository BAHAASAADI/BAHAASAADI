import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { deleteProduct, recordPurchase, recordSale, reverseSale, setProductStatus, transferProduct } from "@/app/admin/actions/inventory";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { PhotoManager } from "@/components/admin/photo-manager";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader, Panel, ProductStatusBadge, table, tableWrap, td, th } from "@/components/admin/ui";
import { Field, Input, Notice, Select } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";
import { formatStorage } from "@/lib/format";
import type { Product, ProductPhoto } from "@/lib/types";

export const metadata = { title: "Phone" };

export default async function ProductAdminPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; done?: string }> }) {
  const { supabase, admin } = await requireAdmin();
  const { id } = await params;
  const { created, done } = await searchParams;
  const { models, shops, shopById, modelById, currencies, mainCurrency, adminNames } = await getLookups();

  const [{ data: product }, { data: priv }, { data: photos }, { data: purchase }, { data: sale }, { data: history }, { data: transfers }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("product_private").select("*").eq("product_id", id).maybeSingle(),
    supabase.from("product_photos").select("*").eq("product_id", id).order("sort_order"),
    supabase.from("purchases").select("*").eq("product_id", id).maybeSingle(),
    supabase.from("sales").select("*").eq("product_id", id).maybeSingle(),
    supabase.from("price_history").select("*").eq("product_id", id).order("changed_at", { ascending: false }).limit(50),
    supabase.from("transfers").select("*").eq("product_id", id).order("transferred_at", { ascending: false }),
  ]);
  if (!product) notFound();
  const p = product as Product;
  const isManager = hasRole(admin.role, "manager");
  const title = `${modelById[p.model_id]?.name ?? "iPhone"} ${formatStorage(p.storage_gb)} · ${p.color}`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title={title}
        back={{ href: "/admin/inventory", label: "Inventory" }}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-white">{p.inventory_id}</span>
            <ProductStatusBadge status={p.status} />
            <span>{shopById[p.shop_id]?.name}</span>
            <span>Price updated {dateTime(p.price_updated_at)}</span>
          </span>
        }
        actions={
          <>
            {p.status !== "sold" && p.is_published ? (
              <Link href={`/en/buy/${p.inventory_id}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-xs hover:border-white">
                <ExternalLink className="h-3.5 w-3.5" /> View on website
              </Link>
            ) : null}
            {p.status === "available" ? (
              <ActionButton action={setProductStatus} fields={{ id: p.id, status: "reserved" }}>
                Mark reserved
              </ActionButton>
            ) : null}
            {p.status === "reserved" ? (
              <ActionButton action={setProductStatus} fields={{ id: p.id, status: "available" }}>
                Mark available
              </ActionButton>
            ) : null}
            {isManager ? (
              <ActionButton action={deleteProduct} fields={{ id: p.id }} variant="danger" confirm="Delete this phone permanently? Sales and purchase records are kept.">
                Delete
              </ActionButton>
            ) : null}
          </>
        }
      />

      {created || done ? (
        <div className="mb-6">
          <Notice tone="success">
            {done === "sold"
              ? "Sale recorded. The phone has been removed from the public catalogue."
              : done === "reversed"
                ? "Sale reversed. The phone is back in stock."
                : `Phone ${p.inventory_id} added to stock.`}
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel title="Photographs" description="Use the arrows to reorder. The first photo is the cover.">
            <PhotoManager productId={p.id} photos={(photos ?? []) as ProductPhoto[]} />
          </Panel>
          <ProductForm
            product={{ ...p, imei: priv?.imei, serial_number: priv?.serial_number, internal_notes: priv?.internal_notes }}
            models={models}
            shops={shops}
            currencies={currencies}
            canEditPrices={isManager}
          />
        </div>

        <aside className="space-y-6">
          {p.status !== "sold" ? (
            <Panel title="Record sale" description="Marks the phone as sold and removes it from the website.">
              <ActionForm action={recordSale} className="space-y-4">
                <input type="hidden" name="id" value={p.id} />
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Field label="Sale price" htmlFor="sale-price">
                    <Input id="sale-price" name="price" type="number" step="0.01" min={0} defaultValue={p.offer_price ?? p.price} required />
                  </Field>
                  <Field label="Currency" htmlFor="sale-currency">
                    <Select id="sale-currency" name="currency" defaultValue={p.currency}>
                      {currencies.filter((c) => c.is_active).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Date" htmlFor="sold_at">
                  <Input id="sold_at" name="sold_at" type="date" defaultValue={today} />
                </Field>
                <Field label="Customer name (optional)" htmlFor="customer_name">
                  <Input id="customer_name" name="customer_name" />
                </Field>
                <Field label="Customer telephone (optional)" htmlFor="customer_phone">
                  <Input id="customer_phone" name="customer_phone" type="tel" />
                </Field>
                <Field label="Notes" htmlFor="sale-notes">
                  <Input id="sale-notes" name="notes" />
                </Field>
                <SubmitButton className="w-full" confirm="Record this sale and mark the phone as sold?">
                  Mark as sold
                </SubmitButton>
              </ActionForm>
            </Panel>
          ) : null}

          {sale ? (
            <Panel title="Sale">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-grey">Date</dt><dd>{dateTime(sale.sold_at, false)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Price</dt><dd>{money(sale.price, sale.currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Cost</dt><dd>{money(sale.cost_main, mainCurrency)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Gross profit</dt><dd>{sale.profit_main != null ? money(sale.profit_main, mainCurrency) : "Unknown (no purchase)"}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">Customer</dt><dd>{sale.customer_name ?? "—"} {sale.customer_phone ?? ""}</dd></div>
              </dl>
              {isManager ? (
                <div className="mt-4">
                  <ActionButton action={reverseSale} fields={{ sale_id: sale.id, product_id: p.id, return_to: "product" }} confirm="Reverse this sale? The phone will return to stock.">
                    Reverse sale
                  </ActionButton>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {p.status !== "sold" ? (
            <Panel title="Transfer to another shop">
              {shops.filter((s) => s.is_active && s.id !== p.shop_id).length ? (
                <ActionForm action={transferProduct} className="space-y-4">
                  <input type="hidden" name="id" value={p.id} />
                  <Field label="Destination" htmlFor="to_shop_id">
                    <Select id="to_shop_id" name="to_shop_id" required defaultValue="">
                      <option value="" disabled>
                        Choose a shop…
                      </option>
                      {shops.filter((s) => s.is_active && s.id !== p.shop_id).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.currency !== p.currency ? ` (prices in ${s.currency})` : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Note" htmlFor="transfer-note">
                    <Input id="transfer-note" name="note" />
                  </Field>
                  <SubmitButton variant="outline" className="w-full">
                    Transfer
                  </SubmitButton>
                </ActionForm>
              ) : (
                <p className="text-sm text-grey">Add another active shop to transfer phones.</p>
              )}
            </Panel>
          ) : null}

          <Panel title="Purchase">
            {purchase ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-grey">Cost</dt><dd>{money(purchase.price, purchase.currency)}</dd></div>
                {purchase.currency !== mainCurrency ? <div className="flex justify-between"><dt className="text-grey">In {mainCurrency}</dt><dd>{money(purchase.price_main, mainCurrency)}</dd></div> : null}
                <div className="flex justify-between"><dt className="text-grey">Date</dt><dd>{dateTime(purchase.purchased_at, false)}</dd></div>
                <div className="flex justify-between"><dt className="text-grey">From</dt><dd className="text-end">{purchase.counterparty_name ?? "—"} <span className="text-grey">({purchase.source.replace("_", "-")})</span></dd></div>
                {purchase.enquiry_id ? <div className="flex justify-between"><dt className="text-grey">Trade-in</dt><dd><Link className="underline" href={`/admin/enquiries/${purchase.enquiry_id}`}>View enquiry</Link></dd></div> : null}
              </dl>
            ) : (
              <ActionForm action={recordPurchase} className="space-y-4">
                <p className="text-sm text-grey">No purchase recorded. Profit cannot be calculated until the cost is known.</p>
                <input type="hidden" name="id" value={p.id} />
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Field label="Cost" htmlFor="purchase-price"><Input id="purchase-price" name="price" type="number" step="0.01" min={0} required /></Field>
                  <Field label="Currency" htmlFor="purchase-currency">
                    <Select id="purchase-currency" name="currency" defaultValue={p.currency}>
                      {currencies.filter((c) => c.is_active).map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}
                    </Select>
                  </Field>
                </div>
                <Field label="Bought from" htmlFor="purchase-source">
                  <Select id="purchase-source" name="source" defaultValue="supplier">
                    <option value="supplier">Supplier</option>
                    <option value="customer">Customer</option>
                    <option value="trade_in">Trade-in</option>
                  </Select>
                </Field>
                <Field label="Name" htmlFor="cp-name"><Input id="cp-name" name="counterparty_name" /></Field>
                <Field label="Date" htmlFor="purchased_at"><Input id="purchased_at" name="purchased_at" type="date" defaultValue={today} /></Field>
                <SubmitButton variant="outline" className="w-full">Record purchase</SubmitButton>
              </ActionForm>
            )}
          </Panel>

          {transfers?.length ? (
            <Panel title="Transfers">
              <ul className="space-y-3 text-sm">
                {transfers.map((t) => (
                  <li key={t.id}>
                    <span className="block">{shopById[t.from_shop_id]?.name ?? "—"} → {shopById[t.to_shop_id]?.name ?? "—"}</span>
                    <span className="block text-xs text-grey">{dateTime(t.transferred_at)} · {adminNames[t.transferred_by] ?? ""}{t.note ? ` · ${t.note}` : ""}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Selling price history</h2>
        {history?.length ? (
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Field</th>
                  <th className={th}>Old</th>
                  <th className={th}>New</th>
                  <th className={th}>Note</th>
                  <th className={th}>By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className={td}>{dateTime(h.changed_at)}</td>
                    <td className={td}>{h.field === "offer_price" ? "Offer price" : "Price"}</td>
                    <td className={td}>{money(h.old_value, h.currency ?? p.currency)}</td>
                    <td className={td}>{money(h.new_value, h.currency ?? p.currency)}</td>
                    <td className={`${td} text-grey`}>{h.note ?? ""}</td>
                    <td className={`${td} text-grey`}>{adminNames[h.changed_by] ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-grey">No changes yet.</p>
        )}
      </div>
    </>
  );
}
