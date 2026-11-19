import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { Notice } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { getLookups } from "@/lib/admin/data";
import type { TradeInEnquiry } from "@/lib/types";

export const metadata = { title: "Add phone" };

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ enquiry?: string }> }) {
  const { supabase, admin } = await requireAdmin();
  const { enquiry: enquiryId } = await searchParams;
  const { models, shops, currencies } = await getLookups();

  let defaults = {};
  let enquiry: TradeInEnquiry | null = null;
  if (enquiryId) {
    const { data } = await supabase.from("trade_in_enquiries").select("*").eq("id", enquiryId).maybeSingle();
    enquiry = data as TradeInEnquiry | null;
    if (enquiry) {
      const replaced = Object.entries(enquiry.answers?.parts ?? {})
        .filter(([, v]) => v === "replaced")
        .map(([k]) => k);
      defaults = {
        model_id: enquiry.model_id ?? undefined,
        storage_gb: enquiry.storage_gb,
        battery_health: enquiry.battery_health ?? undefined,
        condition: enquiry.condition,
        parts_status: replaced.length ? "replaced" : "original",
        replaced_parts: [replaced.join(", "), enquiry.other_replaced].filter(Boolean).join(" — "),
        shop_id: enquiry.preferred_shop_id ?? undefined,
        purchase_price: enquiry.final_offer ?? enquiry.estimated_offer ?? undefined,
        purchase_currency: enquiry.final_offer != null ? enquiry.final_currency ?? enquiry.currency : enquiry.currency,
        purchase_source: "trade_in",
        counterparty_name: enquiry.customer_name,
        counterparty_phone: enquiry.customer_phone,
        enquiry_id: enquiry.id,
      };
    }
  }

  return (
    <>
      <PageHeader title="Add phone" description="Every phone receives a unique inventory ID automatically." back={{ href: "/admin/inventory", label: "Inventory" }} />
      {!shops.length ? (
        <Notice tone="error">
          Add a shop first.{" "}
          <Link href="/admin/shops" className="underline">
            Go to Shops
          </Link>
        </Notice>
      ) : (
        <>
          {enquiry ? (
            <div className="mb-6">
              <Notice>
                Pre-filled from trade-in {enquiry.reference} ({enquiry.customer_name}). Saving will record the purchase and mark the enquiry as completed.
              </Notice>
            </div>
          ) : null}
          <ProductForm models={models} shops={shops} currencies={currencies} canEditPrices={hasRole(admin.role, "manager")} defaults={defaults} />
        </>
      )}
    </>
  );
}
