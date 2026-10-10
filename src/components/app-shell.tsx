"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  ClipboardCheck,
  History,
  ListTodo,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  managerOnly?: boolean;
}

export function AppShell({
  profile,
  pendingCount,
  children,
}: {
  profile: Profile;
  pendingCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isManager = profile.role === "manager";

  const nav: NavItem[] = [
    { href: "/today", label: "My Day", icon: CalendarCheck, badge: pendingCount },
    { href: "/tasks", label: "All Tasks", icon: ListTodo },
    { href: "/history", label: "History", icon: History },
    { href: "/team", label: "Team Overview", icon: Users, managerOnly: true },
    { href: "/settings", label: "Configuration", icon: Settings, managerOnly: true },
  ].filter((n) => !n.managerOnly || isManager);

  const navList = (
    <nav className="flex flex-1 flex-col gap-0.5">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition",
              active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100",
            )}
          >
            <item.icon size={17} className={active ? "text-blue-600" : "text-gray-400"} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ClipboardCheck size={18} />
        </span>
        <span className="font-semibold text-gray-900">DA Task Tracker</span>
      </div>

      <Link href="/tasks/new" onClick={() => setOpen(false)} className="btn-primary mb-4 w-full">
        <Plus size={16} /> New task
      </Link>

      {navList}

      <div className="mt-auto border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar name={profile.full_name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{profile.full_name}</p>
            <p className="truncate text-xs capitalize text-gray-500">{profile.role}</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn-ghost btn-sm" title="Sign out">
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white p-3 lg:block">{sidebarInner}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white p-3 shadow-xl">{sidebarInner}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b border-gray-200 bg-white px-3 lg:hidden">
          <button className="btn-ghost btn-sm" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-semibold">DA Task Tracker</span>
          {pendingCount > 0 && (
            <Link href="/today" className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              {pendingCount} to update
            </Link>
          )}
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
