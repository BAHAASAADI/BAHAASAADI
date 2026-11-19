import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/admin/auth";
import { signOut } from "@/app/admin/actions/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, admin } = await requireAdmin();
  const [enquiries, requests] = await Promise.all([
    supabase.from("trade_in_enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("customer_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return (
    <div className="min-h-dvh">
      <AdminSidebar
        role={admin.role}
        name={admin.full_name || admin.email}
        counts={{ enquiries: enquiries.count ?? 0, requests: requests.count ?? 0 }}
        signOut={signOut}
      />
      <div className="lg:ps-64">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
