"use client";

import { usePathname, useRouter } from "next/navigation";
import { format, subDays } from "date-fns";

export function HistoryFilters({
  from,
  to,
  author,
  people,
}: {
  from: string;
  to: string;
  author: string;
  people?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function go(next: { from?: string; to?: string; author?: string }) {
    const params = new URLSearchParams();
    params.set("from", next.from ?? from);
    params.set("to", next.to ?? to);
    const a = next.author ?? author;
    if (a) params.set("author", a);
    router.replace(`${pathname}?${params.toString()}`);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const preset = (days: number) => go({ from: format(subDays(new Date(), days - 1), "yyyy-MM-dd"), to: today });

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <div>
        <label className="label">From</label>
        <input type="date" value={from} onChange={(e) => go({ from: e.target.value })} className="input w-auto py-1.5" />
      </div>
      <div>
        <label className="label">To</label>
        <input type="date" value={to} onChange={(e) => go({ to: e.target.value })} className="input w-auto py-1.5" />
      </div>
      {people && (
        <div>
          <label className="label">Person</label>
          <select value={author} onChange={(e) => go({ author: e.target.value })} className="input w-auto py-1.5">
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-1">
        <button className="btn-secondary btn-sm" onClick={() => preset(1)}>Today</button>
        <button className="btn-secondary btn-sm" onClick={() => preset(7)}>7 days</button>
        <button className="btn-secondary btn-sm" onClick={() => preset(30)}>30 days</button>
      </div>
    </div>
  );
}
