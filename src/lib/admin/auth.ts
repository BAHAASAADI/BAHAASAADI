import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/types";

export interface AdminRow {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
}

const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

export function hasRole(role: AdminRole, min: AdminRole): boolean {
  return RANK[role] >= RANK[min];
}

/** The signed-in user and their administrator record (null when not an admin). */
export const getAdminSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, admin: null as AdminRow | null };
  const { data } = await supabase.from("admins").select("user_id,email,full_name,role,is_active").eq("user_id", user.id).maybeSingle();
  const admin = data && data.is_active ? (data as AdminRow) : null;
  return { supabase, user, admin };
});

/** For pages: redirects visitors who are not allowed to see the page. */
export async function requireAdmin(min: AdminRole = "staff") {
  const session = await getAdminSession();
  if (!session.user) redirect("/admin/login");
  if (!session.admin) redirect("/admin/no-access");
  if (!hasRole(session.admin.role, min)) redirect("/admin?denied=1");
  return { supabase: session.supabase, user: session.user, admin: session.admin };
}

export type ActionState = { ok: true; message?: string; id?: string } | { ok: false; error: string } | null;

/** For server actions: returns an error state instead of redirecting. */
export async function actionGuard(min: AdminRole = "staff") {
  const session = await getAdminSession();
  if (!session.user || !session.admin) return { error: "Your session has expired. Please sign in again." as const, ctx: null };
  if (!hasRole(session.admin.role, min)) {
    return { error: `This action requires the ${min} role.` as const, ctx: null };
  }
  return { error: null, ctx: { supabase: session.supabase, user: session.user, admin: session.admin } };
}

/** Turns a database error into a message an administrator can act on. */
export function dbError(error: { message: string; code?: string; details?: string | null } | null | undefined): string {
  if (!error) return "Unknown error";
  if (error.code === "23505") return "This value already exists.";
  if (error.code === "23503") return "This record is still used elsewhere (for example by phones, sales or purchases).";
  if (error.code === "42501" || /row-level security/i.test(error.message)) return error.message.includes("row-level") ? "You do not have permission to do this." : error.message;
  return error.message;
}
