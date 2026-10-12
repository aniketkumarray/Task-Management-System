"use client";

import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { format, subMonths } from "date-fns";

export function ExportButton({ today }: { today: string }) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(`${today}T00:00:00`), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });
  const [month, setMonth] = useState(months[0].value);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto py-1.5 text-xs" aria-label="Month to export">
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <a href={`/api/export?month=${month}`} className="btn-secondary btn-sm" download>
          <Download size={14} /> Export Excel
        </a>
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost btn-sm" title="How to get insights with AI">
          <Sparkles size={14} />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-surface p-3 text-xs text-gray-700 shadow-lg">
          <p className="mb-1.5 font-semibold text-gray-900">Get AI insights from this export</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Download the month&apos;s Excel file.</li>
            <li>Open ChatGPT, Claude or Gemini and attach the file.</li>
            <li>
              Paste the prompt from the file&apos;s <span className="font-medium">Read me</span> sheet — it explains every column and asks for
              on-time rate, slip root causes, workload balance and recommendations.
            </li>
          </ol>
          <p className="mt-2 text-gray-500">The workbook also works in Excel on its own: Summary, Tasks, Daily updates, Deadline changes, Stages.</p>
        </div>
      )}
    </div>
  );
}
