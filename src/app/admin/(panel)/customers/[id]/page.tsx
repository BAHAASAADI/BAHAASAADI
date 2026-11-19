import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { deleteCustomer, saveCustomer } from "@/app/admin/actions/business";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { EnquiryStatusBadge, PageHeader, Panel, RequestStatusBadge } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/brand";
import { buttonClass, Field, Input, Textarea } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";
import { formatStorage, telLink, whatsappLink } from "@/lib/format";
import type { EnquiryStatus, RequestStatus } from "@/lib/types";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, admin } = await requireAdmin();
  const { id } = await params;
  const { mainCurrency, shopById } = await getLookups();
  const [{ data: c }, { data: enquiries }, { data: requests }, { data: sales }, { data: purchases }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("trade_in_enquiries").select("id,reference,model_name,storage_gb,estimated_offer,final_offer,currency,final_currency,status,created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("customer_requests").select("id,kind,inventory_id,product_id,message,status,created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("sales").select("id,product_id,inventory_id,description,price,currency,sold_at,shop_id").eq("customer_id", id).order("sold_at", { ascending: false }),
    supabase.from("purchases").select("id,product_id,inventory_id,description,price,currency,purchased_at,source").eq("customer_id", id).order("purchased_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const wa = whatsappLink(c.phone, `Hello ${c.name}, this is iZone.`);
  const tel = telLink(c.phone);
  const spent = (sales ?? []).reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <>
      <PageHeader
        title={c.name}
        back={{ href: "/admin/customers", label: "Customers" }}
        description={
          <span dir="ltr">
            {c.phone}
            {c.email ? ` · ${c.email}` : ""} · customer since {dateTime(c.created_at, false)}
          </span>
        }
        actions={
          <>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
            ) : null}
            {tel ? (
              <a href={tel} className={buttonClass("outline", "sm")}>
                <Phone className="h-4 w-4" /> Call
              </a>
            ) : null}
            {hasRole(admin.role, "manager") ? (
              <ActionButton action={deleteCustomer} fields={{ id: c.id }} variant="ghost" confirm="Delete this customer? Their enquiries, sales and purchases are kept.">
                Delete
              </ActionButton>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel title={`Trade-in enquiries (${enquiries?.length ?? 0})`}>
            {enquiries?.length ? (
              <ul className="divide-y divide-line text-sm">
                {enquiries.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <Link href={`/admin/enquiries/${e.id}`} className="hover:underline">
                      <span className="font-mono">{e.reference}</span> · {e.model_name} {formatStorage(e.storage_gb)}
                      <span className="block text-xs text-grey">{dateTime(e.created_at)}</span>
                    </Link>
                    <span className="flex items-center gap-3">
                      {money(e.final_offer ?? e.estimated_offer, e.final_offer != null ? e.final_currency ?? e.currency : e.currency)}
                      <EnquiryStatusBadge status={e.status as EnquiryStatus} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-grey">None.</p>
            )}
          </Panel>
          <Panel title={`Requests (${requests?.length ?? 0})`}>
            {requests?.length ? (
              <ul className="divide-y divide-line text-sm">
                {requests.map((r) => (
                  <li key={r.id} className="py-3">
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="capitalize">{r.kind === "reserve" ? "Reservation" : r.kind}</span>
                      {r.inventory_id ? (r.product_id ? <Link className="font-mono underline" href={`/admin/inventory/${r.product_id}`}>{r.inventory_id}</Link> : <span className="font-mono">{r.inventory_id}</span>) : null}
                      <RequestStatusBadge status={r.status as RequestStatus} />
                      <span className="text-xs text-grey">{dateTime(r.created_at)}</span>
                    </span>
                    {r.message ? <span className="mt-1 block text-grey">{r.message}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-grey">None.</p>
            )}
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title={`Phones bought (${sales?.length ?? 0})`}>
              {sales?.length ? (
                <ul className="divide-y divide-line text-sm">
                  {sales.map((s) => (
                    <li key={s.id} className="py-3">
                      {s.product_id ? <Link className="hover:underline" href={`/admin/inventory/${s.product_id}`}>{s.description}</Link> : s.description}
                      <span className="block text-xs text-grey">
                        {s.inventory_id} · {money(s.price, s.currency)} · {dateTime(s.sold_at, false)} · {s.shop_id ? shopById[s.shop_id]?.name : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-grey">None.</p>
              )}
            </Panel>
            <Panel title={`Phones sold to iZone (${purchases?.length ?? 0})`}>
              {purchases?.length ? (
                <ul className="divide-y divide-line text-sm">
                  {purchases.map((p) => (
                    <li key={p.id} className="py-3">
                      {p.product_id ? <Link className="hover:underline" href={`/admin/inventory/${p.product_id}`}>{p.description}</Link> : p.description}
                      <span className="block text-xs text-grey">
                        {p.inventory_id} · {money(p.price, p.currency)} · {dateTime(p.purchased_at, false)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-grey">None.</p>
              )}
            </Panel>
          </div>
        </div>
        <aside className="space-y-6">
          {sales?.length ? (
            <Panel title="Summary">
              <p className="text-sm text-grey">Total spent</p>
              <p className="text-2xl font-semibold">{money(spent, sales[0].currency ?? mainCurrency)}</p>
            </Panel>
          ) : null}
          <Panel title="Details">
            <ActionForm action={saveCustomer} className="space-y-4">
              <input type="hidden" name="id" value={c.id} />
              <Field label="Name" htmlFor="c-name">
                <Input id="c-name" name="name" defaultValue={c.name} required />
              </Field>
              <Field label="Email" htmlFor="c-email">
                <Input id="c-email" name="email" type="email" defaultValue={c.email ?? ""} />
              </Field>
              <Field label="Internal notes" htmlFor="c-notes">
                <Textarea id="c-notes" name="notes" defaultValue={c.notes ?? ""} rows={4} />
              </Field>
              <SubmitButton className="w-full">Save</SubmitButton>
            </ActionForm>
          </Panel>
        </aside>
      </div>
    </>
  );
}
