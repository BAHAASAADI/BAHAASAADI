"use server";

import { after } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { formatStorage, whatsappLink } from "@/lib/format";
import { notifyTeam } from "@/lib/notify";
import en from "@/lib/i18n/dictionaries/en";
import type { EstimateResult, RequestKind } from "@/lib/types";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

function money(amount: number | undefined, currency: string) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 2 }).format(amount);
}

async function shopName(id: unknown): Promise<string> {
  if (typeof id !== "string" || !id) return "Any shop";
  const { data } = await createPublicClient().from("shops").select("name").eq("id", id).maybeSingle();
  return data?.name ?? "Any shop";
}

/**
 * Saves a trade-in enquiry. The database recalculates the estimate (the client
 * value is never trusted); the team is then notified in the background.
 */
export async function submitTradeInAction(payload: Record<string, unknown>): Promise<Result<{ reference: string; id: string }>> {
  const { data, error } = await createPublicClient().rpc("submit_trade_in", { p: payload });
  if (error || !data) return { ok: false, error: error?.message ?? "Unknown error" };
  const result = data as { id: string; reference: string; estimate: EstimateResult };

  after(async () => {
    const est = result.estimate;
    const defects = (est.deductions ?? [])
      .filter((d) => d.category === "defect" || d.category === "part")
      .map((d) => en.sell.deductions[d.key as keyof typeof en.sell.deductions] ?? d.key);
    const photos = Array.isArray(payload.photos) ? payload.photos.length : 0;
    await notifyTeam(`New trade-in enquiry ${result.reference} — ${est.model_name} ${formatStorage(est.storage_gb)}`, [
      `New trade-in enquiry ${result.reference}`,
      "",
      `${est.model_name} ${formatStorage(est.storage_gb)} · ${en.conditions[payload.condition as keyof typeof en.conditions] ?? payload.condition} · battery ${payload.battery_health}%`,
      `Estimated offer: ${est.available ? money(est.estimate, est.currency) : "no online price — send an offer"}`,
      `Defects / replaced parts: ${defects.length ? defects.join(", ") : "none declared"}`,
      payload.other_defects ? `Other defects: ${String(payload.other_defects)}` : "",
      `Photos: ${photos}`,
      "",
      `Customer: ${String(payload.name)} — ${String(payload.phone)}`,
      `Preferred shop: ${await shopName(payload.preferred_shop_id)}`,
      whatsappLink(String(payload.phone), `Hello ${String(payload.name)}, this is iZone about your trade-in ${result.reference}.`) ?? "",
      "",
      `Open in the dashboard: ${SITE_URL}/admin/enquiries/${result.id}`,
    ]);
  });

  return { ok: true, reference: result.reference, id: result.id };
}

const KIND_LABEL: Record<RequestKind, string> = { reserve: "Reservation request", question: "Question about a phone", contact: "Contact message" };

/** Saves a reservation / question / contact request and notifies the team. */
export async function submitRequestAction(payload: {
  kind: RequestKind;
  product_id?: string | null;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  locale: string;
}): Promise<Result<{ id: string }>> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("submit_customer_request", { p: payload });
  if (error || !data) return { ok: false, error: error?.message ?? "Unknown error" };

  after(async () => {
    let phoneLine = "";
    if (payload.product_id) {
      const { data: p } = await supabase
        .from("products")
        .select("inventory_id, storage_gb, color, price, offer_price, currency, model:iphone_models(name), shop:shops(name)")
        .eq("id", payload.product_id)
        .maybeSingle();
      if (p) {
        const model = (p.model as unknown as { name: string } | null)?.name ?? "iPhone";
        const shop = (p.shop as unknown as { name: string } | null)?.name ?? "";
        phoneLine = `${p.inventory_id} · ${model} ${formatStorage(p.storage_gb)} ${p.color} · ${money(Number(p.offer_price ?? p.price), p.currency)} · ${shop}`;
      }
    }
    await notifyTeam(`${KIND_LABEL[payload.kind]} from ${payload.name}`, [
      KIND_LABEL[payload.kind],
      "",
      phoneLine ? `Phone: ${phoneLine}` : "",
      `Customer: ${payload.name} — ${payload.phone}${payload.email ? ` — ${payload.email}` : ""}`,
      payload.message ? `Message: ${payload.message}` : "",
      whatsappLink(payload.phone, `Hello ${payload.name}, this is iZone.`) ?? "",
      "",
      `Open in the dashboard: ${SITE_URL}/admin/requests`,
    ]);
  });

  return { ok: true, id: (data as { id: string }).id };
}
