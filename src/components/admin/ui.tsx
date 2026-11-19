import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import type { EnquiryStatus, ProductStatus, RequestStatus } from "@/lib/types";

export const th = "px-4 py-3 text-start text-[0.7rem] font-medium uppercase tracking-[0.12em] text-grey whitespace-nowrap";
export const td = "px-4 py-3 align-top text-sm";
export const tableWrap = "overflow-x-auto rounded-2xl border border-line";
export const table = "w-full min-w-[720px] border-collapse [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tbody_tr:hover]:bg-panel";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-3 inline-block text-xs text-grey hover:text-white">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <div className="mt-2 max-w-2xl text-sm text-grey">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, description, children, actions, className = "" }: { title?: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line p-5 sm:p-6 ${className}`}>
      {title || actions ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
            {description ? <div className="mt-1 text-sm text-grey">{description}</div> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="text-[0.7rem] uppercase tracking-[0.14em] text-grey">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" dir="ltr">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  if (status === "available") return <Badge>Available</Badge>;
  if (status === "reserved") return <Badge tone="solid">Reserved</Badge>;
  return <Badge tone="muted">Sold</Badge>;
}

const ENQUIRY_LABEL: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  negotiating: "Negotiating",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
};
export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  return <Badge tone={status === "new" ? "solid" : status === "rejected" || status === "completed" ? "muted" : "outline"}>{ENQUIRY_LABEL[status]}</Badge>;
}
export const enquiryStatusLabel = ENQUIRY_LABEL;

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={status === "new" ? "solid" : status === "closed" ? "muted" : "outline"}>{status === "new" ? "New" : status === "handled" ? "Handled" : "Closed"}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center text-sm text-grey">{children}</div>;
}

export const CONDITION_LABEL = {
  like_new: "Like new",
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  damaged: "Damaged",
} as const;

export const PARTS_LABEL = { original: "All original", replaced: "Some parts replaced", unknown: "Not verified" } as const;
