"use server";

import { revalidatePath } from "next/cache";
import { actionGuard, dbError, type ActionState } from "@/lib/admin/auth";
import { num, str } from "@/lib/admin/form";

const done = (message: string): ActionState => {
  revalidatePath("/admin", "layout");
  return { ok: true, message };
};

export async function saveBuyPrices(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const modelId = str(fd, "model_id");
  if (!modelId) return { ok: false, error: "Missing model." };
  const storages = fd.getAll("storage").map((v) => Number(v));
  const rows = storages.map((gb) => ({
    storage_gb: gb,
    base_price: str(fd, `base_${gb}`) ?? "",
    price_excellent: str(fd, `excellent_${gb}`) ?? "",
    price_good: str(fd, `good_${gb}`) ?? "",
    price_fair: str(fd, `fair_${gb}`) ?? "",
    price_damaged: str(fd, `damaged_${gb}`) ?? "",
    is_active: fd.get(`active_${gb}`) === "on",
  }));
  for (const r of rows) {
    for (const key of ["base_price", "price_excellent", "price_good", "price_fair", "price_damaged"] as const) {
      const v = r[key];
      if (v !== "" && (!Number.isFinite(Number(v)) || Number(v) < 0)) return { ok: false, error: `Invalid amount for ${r.storage_gb}GB.` };
    }
    const base = Number(r.base_price);
    for (const key of ["price_excellent", "price_good", "price_fair", "price_damaged"] as const) {
      if (r[key] !== "" && r.base_price !== "" && Number(r[key]) > base) {
        return { ok: false, error: `A condition price cannot be higher than the base (like new) price (${r.storage_gb >= 1024 ? `${r.storage_gb / 1024}TB` : `${r.storage_gb}GB`}).` };
      }
    }
  }
  const { data, error } = await guard.ctx.supabase.rpc("save_buy_prices", { p_model_id: modelId, p_rows: rows, p_note: str(fd, "note") });
  if (error) return { ok: false, error: dbError(error) };
  return done(data ? `Saved (${data} price${data === 1 ? "" : "s"} changed).` : "No changes.");
}

export async function saveRules(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const keys = fd.getAll("key").map(String);
  const rules = [];
  for (const key of keys) {
    const type = str(fd, `type_${key}`);
    const value = num(fd, `value_${key}`);
    if (!type || !["percent", "fixed"].includes(type) || value == null || value < 0) return { ok: false, error: `Invalid value for ${key}.` };
    if (type === "percent" && value > 100) return { ok: false, error: "A percentage cannot exceed 100%." };
    rules.push({ key, deduction_type: type, value });
  }
  const { data, error } = await guard.ctx.supabase.rpc("save_trade_in_rules", { p_rules: rules, p_note: str(fd, "note") });
  if (error) return { ok: false, error: dbError(error) };
  return done(data ? `Saved (${data} deduction${data === 1 ? "" : "s"} changed).` : "No changes.");
}

export async function saveBands(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const ids = fd.getAll("band").map(String);
  const bands = [];
  for (const i of ids) {
    if (fd.get(`delete_${i}`) === "on") continue;
    const min = num(fd, `min_${i}`);
    const max = num(fd, `max_${i}`);
    const value = num(fd, `value_${i}`);
    const type = str(fd, `type_${i}`) ?? "percent";
    if (min == null && max == null) continue;
    if (min == null || max == null || value == null || value < 0) return { ok: false, error: "Complete every battery band (from, to and deduction)." };
    bands.push({ id: i.startsWith("new") ? null : i, min_pct: min, max_pct: max, deduction_type: type, value });
  }
  const { error } = await guard.ctx.supabase.rpc("save_battery_bands", { p_bands: bands, p_note: str(fd, "note") });
  if (error) return { ok: false, error: dbError(error) };
  return done("Battery deductions saved.");
}

export async function saveMinOffer(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("owner");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const value = num(fd, "trade_in_min_offer");
  if (value == null || value < 0) return { ok: false, error: "Enter a valid amount." };
  const { error } = await guard.ctx.supabase.from("site_settings").update({ trade_in_min_offer: value }).eq("id", 1);
  if (error) return { ok: false, error: dbError(error) };
  return done("Minimum offer saved.");
}

export async function bulkAdjustBuy(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const mode = str(fd, "mode");
  const value = num(fd, "value");
  if (!mode || value == null) return { ok: false, error: "Choose the adjustment and enter a value." };
  const models = fd.getAll("model_ids").map(String).filter(Boolean);
  const storages = fd.getAll("storages").map(Number).filter(Boolean);
  const { data, error } = await guard.ctx.supabase.rpc("bulk_adjust_buy_prices", {
    p_model_ids: models.length ? models : null,
    p_storages: storages.length ? storages : null,
    p_mode: mode,
    p_value: value,
    p_round_to: num(fd, "round_to"),
    p_note: str(fd, "note"),
  });
  if (error) return { ok: false, error: dbError(error) };
  return done(`${data ?? 0} buying price${data === 1 ? "" : "s"} updated.`);
}

export async function bulkAdjustSell(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const rawMode = str(fd, "mode");
  const offerModes = ["percent_off", "fixed_off", "offer_set", "clear"];
  const target = rawMode && offerModes.includes(rawMode) ? "offer_price" : "price";
  const mode = rawMode === "offer_set" ? "set" : rawMode;
  const value = num(fd, "value");
  if (!mode || (mode !== "clear" && value == null)) return { ok: false, error: "Choose the adjustment and enter a value." };
  const filter: Record<string, string> = {};
  for (const key of ["shop_id", "model_id", "condition", "status"]) {
    const v = str(fd, key);
    if (v) filter[key] = v;
  }
  const { data, error } = await guard.ctx.supabase.rpc("bulk_adjust_sell_prices", {
    p_filter: filter,
    p_target: target,
    p_mode: mode,
    p_value: value ?? 0,
    p_round_to: num(fd, "round_to"),
    p_note: str(fd, "note"),
  });
  if (error) return { ok: false, error: dbError(error) };
  return done(`${data ?? 0} phone${data === 1 ? "" : "s"} updated.`);
}

export async function updateSellPrice(_: ActionState, fd: FormData): Promise<ActionState> {
  const guard = await actionGuard("manager");
  if (!guard.ctx) return { ok: false, error: guard.error };
  const id = str(fd, "id");
  const price = num(fd, "price");
  if (!id || price == null) return { ok: false, error: "Enter a price." };
  const { error } = await guard.ctx.supabase.rpc("update_product_prices", {
    p_id: id,
    p_price: price,
    p_offer: num(fd, "offer_price"),
    p_note: str(fd, "note"),
  });
  if (error) return { ok: false, error: dbError(error) };
  return done("Saved.");
}
