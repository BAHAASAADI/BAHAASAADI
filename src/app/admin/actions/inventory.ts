"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionGuard, dbError, type ActionState } from "@/lib/admin/auth";
import { bool, int, num, str } from "@/lib/admin/form";
import { PRODUCT_PHOTOS_BUCKET } from "@/lib/env";
import { CONDITIONS, type DeviceCondition, type PartsStatus, type PurchaseSource } from "@/lib/types";

const PARTS: PartsStatus[] = ["original", "replaced", "unknown"];
const SOURCES: PurchaseSource[] = ["customer", "supplier", "trade_in"];

function refresh(id?: string) {
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/admin/inventory/${id}`);
}

export async function saveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const { supabase } = guard.ctx;

  const id = str(fd, "id");
  const condition = str(fd, "condition") as DeviceCondition | null;
  const parts = (str(fd, "parts_status") ?? "original") as PartsStatus;
  const status = str(fd, "status") ?? "available";
  const price = num(fd, "price");
  const offer = num(fd, "offer_price");
  const battery = int(fd, "battery_health");

  const product = {
    model_id: str(fd, "model_id"),
    storage_gb: int(fd, "storage_gb"),
    color: str(fd, "color"),
    battery_health: battery,
    condition,
    parts_status: parts,
    replaced_parts: parts === "replaced" ? str(fd, "replaced_parts") : null,
    description: str(fd, "description"),
    price,
    offer_price: offer,
    currency: str(fd, "currency"),
    shop_id: str(fd, "shop_id"),
    is_featured: bool(fd, "is_featured"),
    is_published: bool(fd, "is_published"),
  };

  if (!product.model_id) return { ok: false, error: "Choose the iPhone model." };
  if (!product.storage_gb) return { ok: false, error: "Choose the storage." };
  if (!product.color) return { ok: false, error: "Enter the colour." };
  if (!condition || !CONDITIONS.includes(condition)) return { ok: false, error: "Choose the physical condition." };
  if (!PARTS.includes(parts)) return { ok: false, error: "Choose the original parts status." };
  if (battery != null && (battery < 0 || battery > 100)) return { ok: false, error: "Battery health must be between 0 and 100." };
  if (price == null || price < 0) return { ok: false, error: "Enter a valid selling price." };
  if (offer != null && (offer < 0 || offer >= price)) return { ok: false, error: "The offer price must be lower than the selling price." };
  if (!product.currency) return { ok: false, error: "Choose the currency." };
  if (!product.shop_id) return { ok: false, error: "Choose the shop." };
  if (!["available", "reserved"].includes(status)) return { ok: false, error: "Use “Record sale” to mark a phone as sold." };

  const privateData = { imei: str(fd, "imei"), serial_number: str(fd, "serial_number"), internal_notes: str(fd, "internal_notes") };

  if (id) {
    const { data: current } = await supabase.from("products").select("status").eq("id", id).maybeSingle();
    const patch: Record<string, unknown> = { ...product };
    if (current && current.status !== "sold") patch.status = status;
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) return { ok: false, error: dbError(error) };
    const { error: pErr } = await supabase.from("product_private").upsert({ product_id: id, ...privateData });
    if (pErr) return { ok: false, error: dbError(pErr) };
    refresh(id);
    return { ok: true, message: "Phone saved.", id };
  }

  const { data: created, error } = await supabase
    .from("products")
    .insert({ ...product, status })
    .select("id, inventory_id, model_id, storage_gb, color, shop_id")
    .single();
  if (error || !created) return { ok: false, error: dbError(error) };

  await supabase.from("product_private").insert({ product_id: created.id, ...privateData });

  // Purchase record (cost) — kept separate from the selling price.
  const cost = num(fd, "purchase_price");
  if (cost != null) {
    const source = (str(fd, "purchase_source") ?? "supplier") as PurchaseSource;
    const enquiryId = str(fd, "enquiry_id");
    const { data: model } = await supabase.from("iphone_models").select("name").eq("id", created.model_id).single();
    let customerId: string | null = null;
    if (enquiryId) {
      const { data: enq } = await supabase.from("trade_in_enquiries").select("customer_id").eq("id", enquiryId).maybeSingle();
      customerId = enq?.customer_id ?? null;
    }
    const { error: purchaseError } = await supabase.from("purchases").insert({
      product_id: created.id,
      inventory_id: created.inventory_id,
      model_id: created.model_id,
      description: `${model?.name ?? "iPhone"} ${created.storage_gb >= 1024 ? `${created.storage_gb / 1024}TB` : `${created.storage_gb}GB`} ${created.color}`,
      shop_id: created.shop_id,
      source: SOURCES.includes(source) ? source : "supplier",
      counterparty_name: str(fd, "counterparty_name"),
      counterparty_phone: str(fd, "counterparty_phone"),
      customer_id: customerId,
      enquiry_id: enquiryId,
      price: cost,
      currency: str(fd, "purchase_currency") ?? product.currency,
      purchased_at: str(fd, "purchased_at") ? new Date(`${str(fd, "purchased_at")}T12:00:00Z`).toISOString() : new Date().toISOString(),
      notes: str(fd, "purchase_notes"),
    });
    if (purchaseError) {
      refresh(created.id);
      return { ok: true, id: created.id, message: `Phone added, but the purchase could not be recorded: ${dbError(purchaseError)}` };
    }
    if (enquiryId) {
      await supabase.from("trade_in_enquiries").update({ status: "completed" }).eq("id", enquiryId);
    }
  }

  refresh(created.id);
  return { ok: true, id: created.id, message: `Phone ${created.inventory_id} added.` };
}

export async function setProductStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!id || !status || !["available", "reserved"].includes(status)) return { ok: false, error: "Invalid status." };
  const { error } = await guard.ctx.supabase.from("products").update({ status }).eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  const requestId = str(fd, "request_id");
  if (requestId) await guard.ctx.supabase.from("customer_requests").update({ status: "handled" }).eq("id", requestId);
  refresh(id);
  return { ok: true, message: status === "reserved" ? "Phone marked as reserved." : "Phone is available again." };
}

export async function recordSale(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const price = num(fd, "price");
  if (!id || price == null || price < 0) return { ok: false, error: "Enter the selling price." };
  const soldAt = str(fd, "sold_at");
  const { error } = await guard.ctx.supabase.rpc("record_sale", {
    p_product_id: id,
    p_price: price,
    p_currency: str(fd, "currency"),
    p_sold_at: soldAt ? new Date(`${soldAt}T12:00:00Z`).toISOString() : null,
    p_customer_name: str(fd, "customer_name"),
    p_customer_phone: str(fd, "customer_phone"),
    p_notes: str(fd, "notes"),
  });
  if (error) return { ok: false, error: dbError(error) };
  refresh(id);
  redirect(`/admin/inventory/${id}?done=sold`);
}

export async function reverseSale(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const saleId = str(fd, "sale_id");
  if (!saleId) return { ok: false, error: "Missing sale." };
  const { error } = await guard.ctx.supabase.rpc("reverse_sale", { p_sale_id: saleId });
  if (error) return { ok: false, error: dbError(error) };
  const productId = str(fd, "product_id");
  refresh(productId ?? undefined);
  if (fd.get("return_to") === "product" && productId) redirect(`/admin/inventory/${productId}?done=reversed`);
  return { ok: true, message: "Sale reversed. The phone is back in stock." };
}

export async function transferProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const to = str(fd, "to_shop_id");
  if (!id || !to) return { ok: false, error: "Choose the destination shop." };
  const { error } = await guard.ctx.supabase.rpc("transfer_product", { p_product_id: id, p_to_shop: to, p_note: str(fd, "note") });
  if (error) return { ok: false, error: dbError(error) };
  refresh(id);
  return { ok: true, message: "Phone transferred." };
}

export async function deleteProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  if (!id) return { ok: false, error: "Missing phone." };
  const { supabase } = guard.ctx;
  const { data: photos } = await supabase.from("product_photos").select("path").eq("product_id", id);
  const { data: deleted, error } = await supabase.from("products").delete().eq("id", id).select("inventory_id");
  if (error) return { ok: false, error: dbError(error) };
  if (!deleted?.length) return { ok: false, error: "The phone could not be deleted." };
  if (photos?.length) await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove(photos.map((p) => p.path));
  revalidatePath("/admin", "layout");
  // Leave the deleted phone's page before it re-renders.
  redirect(`/admin/inventory?deleted=${encodeURIComponent(deleted[0].inventory_id)}`);
}

export async function recordPurchase(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const { supabase } = guard.ctx;
  const id = str(fd, "id");
  const price = num(fd, "price");
  if (!id || price == null || price < 0) return { ok: false, error: "Enter the purchase price." };
  const { data: p } = await supabase.from("products").select("id, inventory_id, model_id, storage_gb, color, shop_id, currency, model:iphone_models(name)").eq("id", id).single();
  if (!p) return { ok: false, error: "Phone not found." };
  const source = (str(fd, "source") ?? "supplier") as PurchaseSource;
  const modelName = (p.model as unknown as { name: string } | null)?.name ?? "iPhone";
  const { error } = await supabase.from("purchases").insert({
    product_id: p.id,
    inventory_id: p.inventory_id,
    model_id: p.model_id,
    description: `${modelName} ${p.storage_gb >= 1024 ? `${p.storage_gb / 1024}TB` : `${p.storage_gb}GB`} ${p.color}`,
    shop_id: p.shop_id,
    source: SOURCES.includes(source) ? source : "supplier",
    counterparty_name: str(fd, "counterparty_name"),
    counterparty_phone: str(fd, "counterparty_phone"),
    price,
    currency: str(fd, "currency") ?? p.currency,
    purchased_at: str(fd, "purchased_at") ? new Date(`${str(fd, "purchased_at")}T12:00:00Z`).toISOString() : new Date().toISOString(),
    notes: str(fd, "notes"),
  });
  if (error) return { ok: false, error: dbError(error) };
  refresh(id);
  return { ok: true, message: "Purchase recorded." };
}
