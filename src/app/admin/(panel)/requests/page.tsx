import Link from "next/link";
import { deleteRequest, updateRequest } from "@/app/admin/actions/business";
import { setProductStatus } from "@/app/admin/actions/inventory";
import { ActionButton } from "@/components/admin/forms";
import { Empty, PageHeader, RequestStatusBadge } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/brand";
import { Badge, buttonClass, Select } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups } from "@/lib/admin/data";
import { whatsappLink } from "@/lib/format";
import type { RequestKind, RequestStatus } from "@/lib/types";

export const metadata = { title: "Customer requests" };

const KIND: Record<RequestKind, string> = { reserve: "Reservation", question: "Question", contact: "Contact form" };

interface Row {
  id: string;
  kind: RequestKind;
  product_id: string | null;
  inventory_id: string | null;
  shop_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: RequestStatus;
  locale: string | null;
  created_at: string;
  product: { id: string; status: string } | null;
}

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, admin } = await requireAdmin();
  const sp = await searchParams;
  const { shopById } = await getLookups();
  const status = sp.status ?? "new";

  let query = supabase.from("customer_requests").select("*, product:products(id,status)").order("created_at", { ascending: false }).limit(300);
  if (status !== "all") query = query.eq("status", status);
  if (sp.kind) query = query.eq("kind", sp.kind);
  const { data } = await query;
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader title="Customer requests" description="Reservations, questions about phones and messages from the contact page." />
      <form method="get" className="mb-6 flex flex-wrap gap-3">
        <Select name="status" defaultValue={status} className="!w-auto" aria-label="Status">
          <option value="new">New</option>
          <option value="handled">Handled</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </Select>
        <Select name="kind" defaultValue={sp.kind ?? ""} className="!w-auto" aria-label="Type">
          <option value="">All types</option>
          <option value="reserve">Reservations</option>
          <option value="question">Questions</option>
          <option value="contact">Contact form</option>
        </Select>
        <button type="submit" className={buttonClass("outline", "md")}>
          Filter
        </button>
      </form>

      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((r) => {
            const wa = whatsappLink(r.phone, `Hello ${r.name}, this is iZone${r.inventory_id ? ` about the iPhone ${r.inventory_id}` : ""}.`);
            return (
              <li key={r.id} className="rounded-2xl border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={r.kind === "reserve" ? "solid" : "outline"}>{KIND[r.kind]}</Badge>
                      <RequestStatusBadge status={r.status} />
                      <span className="text-xs text-grey">{dateTime(r.created_at)}</span>
                    </div>
                    <p className="mt-3 font-medium">
                      {r.name} · <span dir="ltr">{r.phone}</span>
                      {r.email ? <span className="text-grey"> · {r.email}</span> : null}
                    </p>
                    {r.inventory_id ? (
                      <p className="mt-1 text-sm text-grey">
                        Phone:{" "}
                        {r.product ? (
                          <Link className="text-white underline" href={`/admin/inventory/${r.product.id}`}>
                            {r.inventory_id}
                          </Link>
                        ) : (
                          `${r.inventory_id} (deleted)`
                        )}
                        {r.product ? ` · currently ${r.product.status}` : ""}
                        {r.shop_id && shopById[r.shop_id] ? ` · ${shopById[r.shop_id].name}` : ""}
                      </p>
                    ) : null}
                    {r.message ? <p className="mt-3 max-w-2xl whitespace-pre-line text-sm">{r.message}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                        <WhatsAppIcon className="h-4 w-4" /> Reply
                      </a>
                    ) : null}
                    {r.kind === "reserve" && r.product?.status === "available" ? (
                      <ActionButton action={setProductStatus} fields={{ id: r.product.id, status: "reserved", request_id: r.id }} variant="primary">
                        Reserve phone
                      </ActionButton>
                    ) : null}
                    {r.status !== "handled" ? (
                      <ActionButton action={updateRequest} fields={{ id: r.id, status: "handled" }}>
                        Mark handled
                      </ActionButton>
                    ) : null}
                    {r.status !== "closed" ? (
                      <ActionButton action={updateRequest} fields={{ id: r.id, status: "closed" }} variant="ghost">
                        Close
                      </ActionButton>
                    ) : null}
                    {hasRole(admin.role, "manager") ? (
                      <ActionButton action={deleteRequest} fields={{ id: r.id }} variant="ghost" confirm="Delete this request?">
                        Delete
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>No requests.</Empty>
      )}
    </>
  );
}
