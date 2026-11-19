"use server";

import { revalidatePath } from "next/cache";
import { actionGuard, dbError, type ActionState } from "@/lib/admin/auth";
import { bool, int, list, num, str } from "@/lib/admin/form";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/types";

const ok = (message: string, id?: string): ActionState => {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, message, id };
};

function validUrl(value: string | null): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- shops
export async function saveShop(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const shop = {
    name: str(fd, "name"),
    address: str(fd, "address"),
    city: str(fd, "city"),
    country: str(fd, "country"),
    phone: str(fd, "phone"),
    whatsapp: str(fd, "whatsapp"),
    opening_hours: str(fd, "opening_hours"),
    maps_url: str(fd, "maps_url"),
    currency: str(fd, "currency"),
    is_active: bool(fd, "is_active"),
    sort_order: int(fd, "sort_order") ?? 0,
  };
  if (!shop.name) return { ok: false, error: "Enter the shop name." };
  if (!shop.currency) return { ok: false, error: "Choose the shop currency." };
  if (!validUrl(shop.maps_url)) return { ok: false, error: "The Google Maps link must start with https://" };
  const { supabase } = guard.ctx;
  if (id) {
    const { error } = await supabase.from("shops").update(shop).eq("id", id);
    if (error) return { ok: false, error: dbError(error) };
    return ok("Shop saved.", id);
  }
  const { data, error } = await supabase.from("shops").insert(shop).select("id").single();
  if (error || !data) return { ok: false, error: dbError(error) };
  // The first shop becomes the one shown in the website's top bar.
  await supabase.from("site_settings").update({ primary_shop_id: data.id }).eq("id", 1).is("primary_shop_id", null);
  return ok("Shop added.", data.id);
}

export async function deleteShop(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("owner");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  if (!id) return { ok: false, error: "Missing shop." };
  const { error } = await guard.ctx.supabase.from("shops").delete().eq("id", id);
  if (error) return { ok: false, error: error.code === "23503" ? "This shop still has phones. Transfer them or deactivate the shop instead." : dbError(error) };
  return ok("Shop deleted.");
}

// ---------------------------------------------------------------- models
export async function saveModel(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const name = str(fd, "name");
  const storages = list(str(fd, "storages"))
    .map((s) => (/tb$/i.test(s) ? Number.parseFloat(s) * 1024 : Number.parseInt(s, 10)))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!name) return { ok: false, error: "Enter the model name." };
  if (!storages.length) return { ok: false, error: "Enter at least one storage, e.g. 128, 256, 512, 1TB." };
  const model = {
    name,
    slug: str(fd, "slug") ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    release_year: int(fd, "release_year"),
    sort_order: int(fd, "sort_order") ?? 0,
    storages: [...new Set(storages)].sort((a, b) => a - b),
    colors: list(str(fd, "colors")),
    is_active: bool(fd, "is_active"),
    display_inches: num(fd, "display_inches"),
    chip: str(fd, "chip"),
    biometrics: str(fd, "biometrics"),
    connector: str(fd, "connector"),
    has_5g: str(fd, "has_5g") == null ? null : str(fd, "has_5g") === "yes",
  };
  if (model.biometrics && !["Face ID", "Touch ID"].includes(model.biometrics)) return { ok: false, error: "Invalid unlock method." };
  if (model.connector && !["Lightning", "USB-C"].includes(model.connector)) return { ok: false, error: "Invalid connector." };
  const { supabase } = guard.ctx;
  const { error } = id ? await supabase.from("iphone_models").update(model).eq("id", id) : await supabase.from("iphone_models").insert(model);
  if (error) return { ok: false, error: dbError(error) };
  return ok(id ? "Model saved." : "Model added.");
}

// ---------------------------------------------------------------- currencies
export async function saveRates(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const codes = fd.getAll("code").map(String);
  const rates = codes.map((code) => ({ code, rate: num(fd, `rate_${code}`), round_to: num(fd, `round_${code}`) }));
  if (rates.some((r) => r.rate == null || r.rate <= 0)) return { ok: false, error: "Every rate must be greater than zero." };
  const { error } = await guard.ctx.supabase.rpc("save_currency_rates", { p_rates: rates, p_note: str(fd, "note") });
  if (error) return { ok: false, error: dbError(error) };
  return ok("Exchange rates saved and confirmed.");
}

export async function saveCurrency(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("owner");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const code = str(fd, "code")?.toUpperCase();
  const currency = {
    code,
    name: str(fd, "name"),
    symbol: str(fd, "symbol") ?? code,
    decimals: int(fd, "decimals") ?? 2,
    round_to: num(fd, "round_to") ?? 1,
    rate: num(fd, "rate"),
    is_active: bool(fd, "is_active"),
    confirmed_at: new Date().toISOString(),
  };
  if (!code || !/^[A-Z]{3}$/.test(code)) return { ok: false, error: "Use a 3-letter ISO code, e.g. EUR." };
  if (!currency.name) return { ok: false, error: "Enter the currency name." };
  if (!currency.rate || currency.rate <= 0) return { ok: false, error: "Enter the exchange rate." };
  const { error } = await guard.ctx.supabase.from("currencies").upsert(currency);
  if (error) return { ok: false, error: dbError(error) };
  return ok("Currency saved.");
}

export async function setMainCurrency(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("owner");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const code = str(fd, "code");
  if (!code) return { ok: false, error: "Choose a currency." };
  const { error } = await guard.ctx.supabase.rpc("set_main_currency", { p_code: code });
  if (error) return { ok: false, error: dbError(error) };
  return ok(`Main currency changed to ${code}. Buying prices and reports were converted at the current rate.`);
}

// ---------------------------------------------------------------- settings
export async function saveSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("owner");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const settings = {
    whatsapp_number: str(fd, "whatsapp_number"),
    contact_phone: str(fd, "contact_phone"),
    contact_email: str(fd, "contact_email"),
    instagram_url: str(fd, "instagram_url"),
    facebook_url: str(fd, "facebook_url"),
    tiktok_url: str(fd, "tiktok_url"),
    primary_shop_id: str(fd, "primary_shop_id"),
  };
  for (const key of ["instagram_url", "facebook_url", "tiktok_url"] as const) {
    if (!validUrl(settings[key])) return { ok: false, error: "Social links must be full addresses starting with https://" };
  }
  if (settings.whatsapp_number && settings.whatsapp_number.replace(/\D/g, "").length < 7) {
    return { ok: false, error: "Enter the WhatsApp number with the country code, e.g. +48 600 000 000." };
  }
  if (settings.contact_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(settings.contact_email)) return { ok: false, error: "Enter a valid email address." };
  const { error } = await guard.ctx.supabase.from("site_settings").update(settings).eq("id", 1);
  if (error) return { ok: false, error: dbError(error) };
  return ok("Settings saved.");
}

// ---------------------------------------------------------------- content
export async function saveReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const review = {
    author_name: str(fd, "author_name"),
    rating: int(fd, "rating") ?? 5,
    body: str(fd, "body"),
    source: str(fd, "source"),
    review_date: str(fd, "review_date"),
    shop_id: str(fd, "shop_id"),
    is_published: bool(fd, "is_published"),
    sort_order: int(fd, "sort_order") ?? 0,
  };
  if (!review.author_name || !review.body) return { ok: false, error: "Enter the customer's name and review." };
  if (review.rating < 1 || review.rating > 5) return { ok: false, error: "Rating must be between 1 and 5." };
  const { supabase } = guard.ctx;
  const { error } = id ? await supabase.from("reviews").update(review).eq("id", id) : await supabase.from("reviews").insert(review);
  if (error) return { ok: false, error: dbError(error) };
  return ok("Review saved.");
}

export async function saveFaq(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const faq = {
    locale: str(fd, "locale"),
    question: str(fd, "question"),
    answer: str(fd, "answer"),
    sort_order: int(fd, "sort_order") ?? 0,
    is_published: bool(fd, "is_published"),
  };
  if (!faq.locale || !faq.question || !faq.answer) return { ok: false, error: "Enter the language, question and answer." };
  const { supabase } = guard.ctx;
  const { error } = id ? await supabase.from("faqs").update(faq).eq("id", id) : await supabase.from("faqs").insert(faq);
  if (error) return { ok: false, error: dbError(error) };
  return ok("Question saved.");
}

export async function deleteContent(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const table = str(fd, "table");
  const id = str(fd, "id");
  if (!id || (table !== "reviews" && table !== "faqs")) return { ok: false, error: "Invalid item." };
  const { error } = await guard.ctx.supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  return ok("Deleted.");
}

export async function savePage(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const page = { slug: str(fd, "slug"), locale: str(fd, "locale"), title: str(fd, "title"), body: str(fd, "body") };
  if (!page.slug || !page.locale || !page.title || !page.body) return { ok: false, error: "Enter a title and content." };
  const { error } = await guard.ctx.supabase.from("pages").upsert(page);
  if (error) return { ok: false, error: dbError(error) };
  return ok("Page saved.");
}

// ---------------------------------------------------------------- team
export async function addTeamMember(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("owner");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const email = str(fd, "email")?.toLowerCase();
  const role = (str(fd, "role") ?? "staff") as AdminRole;
  const password = str(fd, "password");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  if (!["owner", "manager", "staff"].includes(role)) return { ok: false, error: "Choose a role." };

  if (password) {
    if (password.length < 10) return { ok: false, error: "The temporary password must have at least 10 characters." };
    const service = createServiceClient();
    if (!service) return { ok: false, error: "Creating accounts needs SUPABASE_SERVICE_ROLE_KEY on the server. Create the user in Supabase Authentication instead, then add it here without a password." };
    const { error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (error && !/already/i.test(error.message)) return { ok: false, error: error.message };
  }
  const { error } = await guard.ctx.supabase.rpc("add_admin", { p_email: email, p_role: role, p_full_name: str(fd, "full_name") });
  if (error) return { ok: false, error: dbError(error) };
  return ok(`${email} can now sign in as ${role}.`);
}

export async function updateTeamMember(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("owner");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const userId = str(fd, "user_id");
  const role = str(fd, "role") as AdminRole | null;
  if (!userId || !role) return { ok: false, error: "Invalid member." };
  const { error } = await guard.ctx.supabase.from("admins").update({ role, is_active: bool(fd, "is_active"), full_name: str(fd, "full_name") }).eq("user_id", userId);
  if (error) return { ok: false, error: /owner/i.test(error.message) ? "There must always be at least one active owner." : dbError(error) };
  return ok("Team member updated.");
}
