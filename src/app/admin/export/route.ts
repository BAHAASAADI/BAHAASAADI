import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { resolvePeriod } from "@/lib/admin/data";

function csv(rows: Record<string, unknown>[], columns: [string, string][]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Neutralise spreadsheet formulas and quote every value.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [columns.map(([, label]) => escape(label)).join(","), ...rows.map((r) => columns.map(([key]) => escape(r[key])).join(","))].join("\r\n");
}

/** CSV export of sales or purchases for accounting (dashboard users only). */
export async function GET(request: NextRequest) {
  const { supabase, admin } = await getAdminSession();
  if (!admin) return new NextResponse("Not authorised", { status: 401 });
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") === "purchases" ? "purchases" : "sales";
  const period = resolvePeriod(sp.get("period") ?? "all", sp.get("from") ?? undefined, sp.get("to") ?? undefined);
  const shop = sp.get("shop");
  const dateCol = type === "sales" ? "sold_at" : "purchased_at";

  const { data: shops } = await supabase.from("shops").select("id,name");
  const shopName = Object.fromEntries((shops ?? []).map((s) => [s.id, s.name]));

  let q = supabase.from(type).select("*").order(dateCol, { ascending: false }).limit(10000);
  if (shop) q = q.eq("shop_id", shop);
  if (period.from) q = q.gte(dateCol, period.from);
  if (period.to) q = q.lt(dateCol, period.to);
  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });
  const rows = (data ?? []).map((r) => ({ ...r, shop: r.shop_id ? shopName[r.shop_id] : "", date: String(r[dateCol]).slice(0, 10) }));

  const body =
    type === "sales"
      ? csv(rows, [
          ["date", "Date"],
          ["inventory_id", "Inventory ID"],
          ["description", "Phone"],
          ["shop", "Shop"],
          ["price", "Selling price"],
          ["currency", "Currency"],
          ["price_main", "Selling price (main currency)"],
          ["cost_main", "Purchase cost (main currency)"],
          ["profit_main", "Gross profit (main currency)"],
          ["customer_name", "Customer"],
          ["customer_phone", "Customer telephone"],
          ["notes", "Notes"],
        ])
      : csv(rows, [
          ["date", "Date"],
          ["inventory_id", "Inventory ID"],
          ["description", "Phone"],
          ["shop", "Shop"],
          ["source", "Source"],
          ["counterparty_name", "Supplier / customer"],
          ["counterparty_phone", "Telephone"],
          ["price", "Purchase price"],
          ["currency", "Currency"],
          ["price_main", "Purchase price (main currency)"],
          ["notes", "Notes"],
        ]);

  return new NextResponse(`﻿${body}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="izone-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
