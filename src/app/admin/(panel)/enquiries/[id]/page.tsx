import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEnquiry, updateEnquiry } from "@/app/admin/actions/business";
import { ActionButton, ActionForm, SubmitButton } from "@/components/admin/forms";
import { CONDITION_LABEL, EnquiryStatusBadge, enquiryStatusLabel, PageHeader, Panel } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/brand";
import { buttonClass, Field, Input, Select, Textarea } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups, money } from "@/lib/admin/data";
import { toBrowserUrl, TRADE_IN_PHOTOS_BUCKET } from "@/lib/env";
import { formatStorage, whatsappLink } from "@/lib/format";
import en from "@/lib/i18n/dictionaries/en";
import { ENQUIRY_STATUSES, FUNCTION_KEYS, type TradeInEnquiry } from "@/lib/types";

export const metadata = { title: "Trade-in enquiry" };

const PART_LABEL = { original: "Original", replaced: "Replaced", unknown: "Not sure" } as const;

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, admin } = await requireAdmin();
  const { id } = await params;
  const { shopById, currencies } = await getLookups();
  const [{ data }, { data: photos }, { data: purchase }] = await Promise.all([
    supabase.from("trade_in_enquiries").select("*").eq("id", id).maybeSingle(),
    supabase.from("trade_in_photos").select("*").eq("enquiry_id", id).order("created_at"),
    supabase.from("purchases").select("id, product_id, inventory_id").eq("enquiry_id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const e = data as TradeInEnquiry;

  const signed = photos?.length
    ? (await supabase.storage.from(TRADE_IN_PHOTOS_BUCKET).createSignedUrls(photos.map((p) => p.path), 60 * 30)).data ?? []
    : [];

  const offer = e.final_offer ?? e.estimated_offer;
  const offerCurrency = e.final_offer != null ? e.final_currency ?? e.currency : e.currency;
  const waText = `Hello ${e.customer_name}, this is iZone about your trade-in ${e.reference} (${e.model_name} ${formatStorage(e.storage_gb)}).${offer != null ? ` Our offer: ${money(offer, offerCurrency)}.` : ""}`;
  const wa = whatsappLink(e.customer_phone, waText);
  const functional = e.answers?.functional ?? {};
  const parts = e.answers?.parts ?? {};
  const deductions = e.breakdown?.deductions ?? [];

  return (
    <>
      <PageHeader
        title={`${e.reference} · ${e.model_name} ${formatStorage(e.storage_gb)}`}
        back={{ href: "/admin/enquiries", label: "Trade-in enquiries" }}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <EnquiryStatusBadge status={e.status} /> Received {dateTime(e.created_at)} · status changed {dateTime(e.status_changed_at)}
          </span>
        }
        actions={
          <>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp customer
              </a>
            ) : null}
            {purchase?.product_id ? (
              <Link href={`/admin/inventory/${purchase.product_id}`} className={buttonClass("outline", "sm")}>
                View phone {purchase.inventory_id}
              </Link>
            ) : (
              <Link href={`/admin/inventory/new?enquiry=${e.id}`} className={buttonClass("primary", "sm")}>
                Add to inventory
              </Link>
            )}
            {hasRole(admin.role, "manager") ? (
              <ActionButton action={deleteEnquiry} fields={{ id: e.id }} variant="danger" confirm="Delete this enquiry and its photos?">
                Delete
              </ActionButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Panel title="Customer" actions={e.customer_id ? <Link href={`/admin/customers/${e.customer_id}`} className="text-xs text-grey hover:text-white">Customer history →</Link> : null}>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-grey">Name</dt>
                <dd>{e.customer_name}</dd>
              </div>
              <div>
                <dt className="text-grey">Telephone</dt>
                <dd dir="ltr">
                  <a href={`tel:${e.customer_phone}`} className="hover:underline">
                    {e.customer_phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-grey">Preferred shop</dt>
                <dd>{e.preferred_shop_id ? shopById[e.preferred_shop_id]?.name : "Any shop"}</dd>
              </div>
              <div>
                <dt className="text-grey">Language</dt>
                <dd className="uppercase">{e.locale ?? "—"}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Device declared by the customer">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-grey">Model</dt>
                <dd>
                  {e.model_name} {formatStorage(e.storage_gb)}
                </dd>
              </div>
              <div>
                <dt className="text-grey">Condition</dt>
                <dd>{CONDITION_LABEL[e.condition]}</dd>
              </div>
              <div>
                <dt className="text-grey">Battery health</dt>
                <dd>{e.battery_health ?? "—"}%</dd>
              </div>
            </dl>
            <h3 className="mb-2 mt-6 text-sm font-semibold">Functionality</h3>
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {FUNCTION_KEYS.map((k) => (
                <li key={k} className="flex justify-between border-b border-line py-1.5">
                  <span className="text-grey">{en.sell.questions[k]}</span>
                  <span>{functional[k] === false ? "No" : "Yes"}</span>
                </li>
              ))}
              <li className="flex justify-between border-b border-line py-1.5">
                <span className="text-grey">Water damage</span>
                <span>{e.answers?.water_damage ? "Yes" : "No"}</span>
              </li>
            </ul>
            {e.other_defects ? (
              <p className="mt-4 text-sm">
                <span className="text-grey">Other defects: </span>
                {e.other_defects}
              </p>
            ) : null}
            <h3 className="mb-2 mt-6 text-sm font-semibold">Components</h3>
            <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {(["screen", "battery", "cameras", "other"] as const).map((k) => (
                <li key={k} className="flex justify-between border-b border-line py-1.5">
                  <span className="text-grey capitalize">{k === "other" ? "Other parts" : k}</span>
                  <span>{parts[k] ? PART_LABEL[parts[k]!] : "—"}</span>
                </li>
              ))}
            </ul>
            {e.other_replaced ? (
              <p className="mt-4 text-sm">
                <span className="text-grey">Replaced: </span>
                {e.other_replaced}
              </p>
            ) : null}
          </Panel>

          <Panel title={`Photographs (${photos?.length ?? 0})`}>
            {signed.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {signed.map((s, i) =>
                  s.signedUrl ? (
                    <a key={s.path ?? i} href={toBrowserUrl(s.signedUrl)} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={toBrowserUrl(s.signedUrl)} alt={`Customer photo ${i + 1}`} className="h-full w-full object-cover" />
                    </a>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-sm text-grey">No photos uploaded.</p>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Offer">
            {e.estimated_offer != null ? (
              <>
                <p className="text-xs uppercase tracking-[0.14em] text-grey">Estimated offer</p>
                <p className="mt-1 text-3xl font-semibold">{money(e.estimated_offer, e.currency)}</p>
                <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-grey">Base price</dt>
                    <dd>{money(e.breakdown?.base_price ?? null, e.currency)}</dd>
                  </div>
                  {deductions.map((d) => (
                    <div key={d.key} className="flex justify-between">
                      <dt className="text-grey">{en.sell.deductions[d.key as keyof typeof en.sell.deductions] ?? d.key}</dt>
                      <dd>− {money(d.amount, e.currency)}</dd>
                    </div>
                  ))}
                </dl>
                {e.breakdown?.inspection_required ? <p className="mt-3 text-xs text-grey">Customer answers require inspection.</p> : null}
              </>
            ) : (
              <p className="text-sm text-grey">No buying price was configured for this model/storage when the customer asked. Set a final offer below.</p>
            )}
          </Panel>

          <Panel title="Update enquiry">
            <ActionForm action={updateEnquiry} className="space-y-4">
              <input type="hidden" name="id" value={e.id} />
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={e.status}>
                  {ENQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {enquiryStatusLabel[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <Field label="Final offer (override)" htmlFor="final_offer">
                  <Input id="final_offer" name="final_offer" type="number" min={0} step="0.01" defaultValue={e.final_offer ?? ""} placeholder={e.estimated_offer != null ? String(e.estimated_offer) : ""} />
                </Field>
                <Field label="Currency" htmlFor="final_currency">
                  <Select id="final_currency" name="final_currency" defaultValue={e.final_currency ?? (e.preferred_shop_id ? shopById[e.preferred_shop_id]?.currency : e.currency) ?? e.currency}>
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Internal notes" htmlFor="admin_notes">
                <Textarea id="admin_notes" name="admin_notes" defaultValue={e.admin_notes ?? ""} rows={4} />
              </Field>
              <SubmitButton className="w-full">Save</SubmitButton>
            </ActionForm>
          </Panel>
        </aside>
      </div>
    </>
  );
}
