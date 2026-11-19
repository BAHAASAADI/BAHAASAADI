"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionGuard, dbError, type ActionState } from "@/lib/admin/auth";
import { num, str } from "@/lib/admin/form";
import { TRADE_IN_PHOTOS_BUCKET } from "@/lib/env";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/types";

export async function updateEnquiry(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const status = str(fd, "status") as EnquiryStatus | null;
  if (!id || !status || !ENQUIRY_STATUSES.includes(status)) return { ok: false, error: "Choose a status." };
  const finalOffer = num(fd, "final_offer");
  if (finalOffer != null && finalOffer < 0) return { ok: false, error: "The final offer cannot be negative." };
  const { error } = await guard.ctx.supabase
    .from("trade_in_enquiries")
    .update({
      status,
      final_offer: finalOffer,
      final_currency: finalOffer != null ? str(fd, "final_currency") : null,
      admin_notes: str(fd, "admin_notes"),
    })
    .eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Enquiry updated." };
}

export async function deleteEnquiry(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  if (!id) return { ok: false, error: "Missing enquiry." };
  const { supabase } = guard.ctx;
  const { data: photos } = await supabase.from("trade_in_photos").select("path").eq("enquiry_id", id);
  const { error } = await supabase.from("trade_in_enquiries").delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  if (photos?.length) await supabase.storage.from(TRADE_IN_PHOTOS_BUCKET).remove(photos.map((p) => p.path));
  revalidatePath("/admin", "layout");
  redirect("/admin/enquiries?deleted=1");
}

export async function updateRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!id || !status || !["new", "handled", "closed"].includes(status)) return { ok: false, error: "Invalid status." };
  const { error } = await guard.ctx.supabase.from("customer_requests").update({ status }).eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteRequest(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  if (!id) return { ok: false, error: "Missing request." };
  const { error } = await guard.ctx.supabase.from("customer_requests").delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function saveCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("staff");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const name = str(fd, "name");
  const email = str(fd, "email");
  if (!id || !name) return { ok: false, error: "Enter the customer's name." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  const { error } = await guard.ctx.supabase.from("customers").update({ name, email, notes: str(fd, "notes") }).eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Customer saved." };
}

export async function deleteCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  if (!id) return { ok: false, error: "Missing customer." };
  const { error } = await guard.ctx.supabase.from("customers").delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  revalidatePath("/admin", "layout");
  redirect("/admin/customers?deleted=1");
}
