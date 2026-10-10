"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

interface Opt {
  id: string;
  name: string;
}

export function TaskFilters({
  people,
  types,
  value,
}: {
  people: Opt[];
  types: Opt[];
  value: { assignee: string; type: string; status: string; q: string; overdue: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function update(patch: Partial<typeof value>) {
    const next = { ...value, ...patch };
    const params = new URLSearchParams();
    if (next.assignee) params.set("assignee", next.assignee);
    if (next.type) params.set("type", next.type);
    if (next.status && next.status !== "active") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.overdue) params.set("overdue", "1");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        type="search"
        defaultValue={value.q}
        placeholder="Search title…"
        className="input w-48 py-1.5"
        onKeyDown={(e) => {
          if (e.key === "Enter") update({ q: (e.target as HTMLInputElement).value });
        }}
        onBlur={(e) => {
          if (e.target.value !== value.q) update({ q: e.target.value });
        }}
      />
      <select value={value.assignee} onChange={(e) => update({ assignee: e.target.value })} className="input w-auto py-1.5">
        <option value="">Everyone</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select value={value.type} onChange={(e) => update({ type: e.target.value })} className="input w-auto py-1.5">
        <option value="">All types</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <select value={value.status} onChange={(e) => update({ status: e.target.value })} className="input w-auto py-1.5">
        <option value="active">Active (open + on hold)</option>
        <option value="open">Open</option>
        <option value="on_hold">On hold</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="all">All</option>
      </select>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-700">
        <input type="checkbox" checked={value.overdue} onChange={(e) => update({ overdue: e.target.checked })} />
        Overdue only
      </label>
    </div>
  );
}
