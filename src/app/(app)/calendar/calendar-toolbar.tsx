"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CalendarToolbar({
  view,
  title,
  prevDate,
  nextDate,
  todayDate,
  assignee,
  people,
  me,
}: {
  view: "month" | "timeline";
  title: string;
  prevDate: string;
  nextDate: string;
  todayDate: string;
  assignee: string;
  people: { id: string; name: string }[];
  me: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go(patch: { view?: string; date?: string; assignee?: string }) {
    const params = new URLSearchParams();
    const v = patch.view ?? view;
    if (v !== "month") params.set("view", v);
    if (patch.date) params.set("date", patch.date);
    const a = patch.assignee ?? assignee;
    if (a) params.set("assignee", a);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <button className="btn-secondary btn-sm" onClick={() => go({ date: prevDate })} aria-label="Previous">
          <ChevronLeft size={14} />
        </button>
        <button className="btn-secondary btn-sm" onClick={() => go({ date: todayDate })}>
          Today
        </button>
        <button className="btn-secondary btn-sm" onClick={() => go({ date: nextDate })} aria-label="Next">
          <ChevronRight size={14} />
        </button>
      </div>

      <h2 className="text-sm font-semibold text-gray-900 sm:text-base">{title}</h2>

      <div className="ml-auto flex items-center gap-2">
        <select value={assignee} onChange={(e) => go({ assignee: e.target.value })} className="input w-auto py-1.5 text-xs">
          <option value="">Everyone</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === me ? `${p.name} (me)` : p.name}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5">
          {(["month", "timeline"] as const).map((v) => (
            <button
              key={v}
              onClick={() => go({ view: v })}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize",
                view === v ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
