"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
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
  short?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
  managerOnly?: boolean;
  mobileBar?: boolean;
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
    { href: "/today", label: "My Day", icon: CalendarCheck, badge: pendingCount, mobileBar: true },
    { href: "/tasks", label: "All Tasks", short: "Tasks", icon: ListTodo, mobileBar: true },
    { href: "/calendar", label: "Calendar", icon: CalendarDays, mobileBar: true },
    { href: "/history", label: "History", icon: History, mobileBar: true },
    { href: "/team", label: "Team Overview", short: "Team", icon: Users, managerOnly: true, mobileBar: true },
    { href: "/settings", label: "Configuration", icon: Settings, managerOnly: true },
  ].filter((n) => !n.managerOnly || isManager);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navList = (
    <nav className="flex flex-1 flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(item.href);
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
        <div className="flex items-center gap-1">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            title="My profile"
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-100",
              isActive("/profile") && "bg-blue-50",
            )}
          >
            <Avatar name={profile.full_name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{profile.full_name}</p>
              <p className="truncate text-xs text-gray-500">
                <span className="capitalize">{profile.role}</span> · Profile &amp; password
              </p>
            </div>
          </Link>
          <form action={signOut}>
            <button type="submit" className="btn-ghost btn-sm" title="Sign out">
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  const barItems = nav.filter((n) => n.mobileBar);

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white p-3 lg:block">{sidebarInner}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white p-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xl">
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-gray-200 bg-white px-3 pt-[env(safe-area-inset-top)] lg:hidden">
          <button className="btn-ghost btn-sm -ml-1" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="font-semibold">DA Task Tracker</span>
          <Link href="/tasks/new" className="btn-primary btn-sm ml-auto" aria-label="New task">
            <Plus size={14} /> New
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="flex">
            {barItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                      active ? "text-blue-700" : "text-gray-500",
                    )}
                  >
                    <item.icon size={20} />
                    {item.short ?? item.label}
                    {item.badge ? (
                      <span className="absolute top-1 left-1/2 ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
