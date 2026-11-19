"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  Coins,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Settings,
  Smartphone,
  Tags,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand";
import type { AdminRole } from "@/lib/types";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; min?: AdminRole; badge?: number };

const RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

export function AdminSidebar({
  role,
  name,
  counts,
  signOut,
}: {
  role: AdminRole;
  name: string;
  counts: { enquiries: number; requests: number };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  const groups: { title: string; items: Item[] }[] = [
    {
      title: "Business",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/inventory", label: "Inventory", icon: Smartphone },
        { href: "/admin/enquiries", label: "Trade-in enquiries", icon: Inbox, badge: counts.enquiries },
        { href: "/admin/requests", label: "Customer requests", icon: MessageSquare, badge: counts.requests },
        { href: "/admin/transactions", label: "Sales & purchases", icon: Receipt },
        { href: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight },
      ],
    },
    {
      title: "Pricing",
      items: [
        { href: "/admin/selling-prices", label: "Selling prices", icon: Tags },
        { href: "/admin/buying-prices", label: "Buying prices", icon: Coins },
        { href: "/admin/market", label: "Market updates", icon: TrendingUp, min: "manager" },
        { href: "/admin/price-history", label: "Price history", icon: History },
      ],
    },
    {
      title: "Setup",
      items: [
        { href: "/admin/shops", label: "Shops", icon: Building2 },
        { href: "/admin/models", label: "iPhone models", icon: Layers },
        { href: "/admin/currencies", label: "Currencies", icon: Coins },
        { href: "/admin/content", label: "Website content", icon: FileText, min: "manager" },
        { href: "/admin/settings", label: "Settings", icon: Settings, min: "owner" },
        { href: "/admin/team", label: "Team", icon: Users, min: "owner" },
      ],
    },
  ];

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  const nav = (
    <nav className="flex flex-1 flex-col gap-8 overflow-y-auto px-3 py-6" aria-label="Dashboard">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-[0.65rem] uppercase tracking-[0.18em] text-muted">{g.title}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items
              .filter((i) => !i.min || RANK[role] >= RANK[i.min])
              .map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${active(i.href) ? "bg-white text-black" : "text-grey hover:bg-panel hover:text-white"}`}
                  >
                    <i.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{i.label}</span>
                    {i.badge ? (
                      <span className={`rounded-full px-2 text-[0.7rem] ${active(i.href) ? "bg-black text-white" : "bg-white text-black"}`}>{i.badge}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-line p-3">
      <Link href="/admin/account" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-grey hover:bg-panel hover:text-white">
        <UserRound className="h-4 w-4" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-white">{name}</span>
          <span className="block text-[0.7rem] capitalize">{role}</span>
        </span>
      </Link>
      <form action={signOut}>
        <button type="submit" className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-grey hover:bg-panel hover:text-white">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
      <Link href="/" target="_blank" className="mt-1 block px-3 py-2 text-xs text-muted hover:text-white">
        View website ↗
      </Link>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-line bg-black lg:flex">
        <Link href="/admin" className="block border-b border-line px-6 py-5">
          <Logo className="w-24" sizes="96px" />
          <span className="mt-1 block text-[0.6rem] tracking-[0.3em] text-grey">DASHBOARD</span>
        </Link>
        {nav}
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-black px-4 lg:hidden">
        <Link href="/admin">
          <Logo className="w-20" sizes="80px" />
        </Link>
        <button type="button" onClick={() => setOpenOn(open ? null : pathname)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="p-2">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open ? (
        <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col bg-black lg:hidden">
          {nav}
          {footer}
        </div>
      ) : null}
    </>
  );
}
