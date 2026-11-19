import { deleteShop, saveShop } from "@/app/admin/actions/setup";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge, Field, Input, Notice, Select, Textarea } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { getLookups, money } from "@/lib/admin/data";
import type { Currency, Shop } from "@/lib/types";

export const metadata = { title: "Shops" };

function ShopFields({ shop, currencies, disabled }: { shop?: Shop; currencies: Currency[]; disabled: boolean }) {
  const p = shop?.id ?? "new";
  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shop ? <input type="hidden" name="id" value={shop.id} /> : null}
      <Field label="Shop name" htmlFor={`${p}-name`}>
        <Input id={`${p}-name`} name="name" defaultValue={shop?.name ?? ""} required placeholder="iZone Centre" />
      </Field>
      <Field label="Address" htmlFor={`${p}-address`}>
        <Input id={`${p}-address`} name="address" defaultValue={shop?.address ?? ""} />
      </Field>
      <Field label="City" htmlFor={`${p}-city`}>
        <Input id={`${p}-city`} name="city" defaultValue={shop?.city ?? ""} />
      </Field>
      <Field label="Country" htmlFor={`${p}-country`}>
        <Input id={`${p}-country`} name="country" defaultValue={shop?.country ?? ""} />
      </Field>
      <Field label="Telephone" htmlFor={`${p}-phone`}>
        <Input id={`${p}-phone`} name="phone" type="tel" defaultValue={shop?.phone ?? ""} placeholder="+48 …" />
      </Field>
      <Field label="WhatsApp number" htmlFor={`${p}-whatsapp`} hint="With country code. Used for this shop's phones.">
        <Input id={`${p}-whatsapp`} name="whatsapp" type="tel" defaultValue={shop?.whatsapp ?? ""} placeholder="+48 …" />
      </Field>
      <Field label="Google Maps link" htmlFor={`${p}-maps`} className="sm:col-span-2">
        <Input id={`${p}-maps`} name="maps_url" type="url" defaultValue={shop?.maps_url ?? ""} placeholder="https://maps.app.goo.gl/…" />
      </Field>
      <Field label="Currency" htmlFor={`${p}-currency`} hint="Default currency for this shop's prices.">
        <Select id={`${p}-currency`} name="currency" defaultValue={shop?.currency ?? currencies.find((c) => c.rate === 1)?.code ?? ""} required>
          {currencies.filter((c) => c.is_active || c.code === shop?.currency).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Opening hours" htmlFor={`${p}-hours`} hint="One line per period, e.g. “Mon–Sat 10:00–20:00”." className="sm:col-span-2">
        <Textarea id={`${p}-hours`} name="opening_hours" defaultValue={shop?.opening_hours ?? ""} rows={3} />
      </Field>
      <div className="grid content-end gap-3">
        <Field label="Display order" htmlFor={`${p}-sort`}>
          <Input id={`${p}-sort`} name="sort_order" type="number" defaultValue={shop?.sort_order ?? 0} />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={shop?.is_active ?? true} className="h-4 w-4 accent-white" /> Active (shown on the website)
        </label>
      </div>
    </fieldset>
  );
}

export default async function ShopsAdminPage() {
  const { supabase, admin } = await requireAdmin();
  const { shops, currencies, settings, mainCurrency } = await getLookups();
  const canEdit = hasRole(admin.role, "manager");
  const { data: stats } = await supabase.rpc("shop_stats", { p_from: null, p_to: null });
  const statById = Object.fromEntries(((stats ?? []) as { shop_id: string; in_stock: number; inventory_value: number; sold: number; revenue: number }[]).map((s) => [s.shop_id, s]));

  return (
    <>
      <PageHeader title="Shops" description="Each shop has its own stock, contact details, opening hours, WhatsApp number and currency. The shop chosen in Settings appears in the website's top bar." />
      {!canEdit ? (
        <div className="mb-6">
          <Notice>Only owners and managers can edit shops.</Notice>
        </div>
      ) : null}

      <div className="space-y-4">
        {shops.map((shop) => {
          const st = statById[shop.id];
          return (
            <details key={shop.id} className="rounded-2xl border border-line" open={shops.length === 1}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5">
                <span className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{shop.name}</span>
                  {!shop.is_active ? <Badge tone="muted">Inactive</Badge> : null}
                  {settings?.primary_shop_id === shop.id ? <Badge>Top bar</Badge> : null}
                </span>
                <span className="text-sm text-grey">
                  {[shop.city, shop.country].filter(Boolean).join(", ") || "No address yet"} · {shop.currency}
                  {st ? ` · ${st.in_stock} in stock · value ${money(st.inventory_value, mainCurrency, 0)} · ${st.sold} sold` : ""}
                </span>
              </summary>
              <div className="border-t border-line p-5">
                <ActionForm action={saveShop}>
                  <ShopFields shop={shop} currencies={currencies} disabled={!canEdit} />
                  {canEdit ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <SubmitButton>Save shop</SubmitButton>
                    </div>
                  ) : null}
                </ActionForm>
                {hasRole(admin.role, "owner") ? (
                  <div className="mt-3">
                    <ActionButton action={deleteShop} fields={{ id: shop.id }} variant="ghost" confirm="Delete this shop? This only works if it has no phones.">
                      Delete shop
                    </ActionButton>
                  </div>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>

      {canEdit ? (
        <Panel title="Add a shop" className="mt-8">
          <ActionForm action={saveShop} resetOnSuccess>
            <ShopFields currencies={currencies} disabled={false} />
            <div className="mt-5">
              <SubmitButton>Add shop</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      ) : null}
    </>
  );
}
