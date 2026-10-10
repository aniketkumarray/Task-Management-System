"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings", label: "Task types & stages" },
  { href: "/settings/team", label: "Team members" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex gap-1 border-b border-gray-200">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
