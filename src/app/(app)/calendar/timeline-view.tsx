import Link from "next/link";
import { format, parseISO } from "date-fns";
import { cn, ticketLabel } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import { EmptyState } from "@/components/ui";
import type { TaskWithRelations } from "@/lib/types";

const COL = 26; // px per day

export function TimelineView({ days, tasks, today }: { days: string[]; tasks: TaskWithRelations[]; today: string }) {
  const n = days.length;
  const first = days[0]!;
  const last = days[n - 1]!;
  const idx = (d: string) => days.indexOf(d);
  const clampIdx = (d: string) => (d < first ? 0 : d > last ? n - 1 : idx(d));
  const gridStyle = { gridTemplateColumns: `repeat(${n}, ${COL}px)` };

  const months: { label: string; start: number; end: number }[] = [];
  days.forEach((d, i) => {
    const label = format(parseISO(d), "MMMM yyyy");
    const cur = months[months.length - 1];
    if (cur && cur.label === label) cur.end = i;
    else months.push({ label, start: i, end: i });
  });

  const groups = new Map<string, { name: string; tasks: TaskWithRelations[] }>();
  for (const t of tasks) {
    const g = groups.get(t.assignee_id) ?? { name: t.assignee.full_name, tasks: [] };
    g.tasks.push(t);
    groups.set(t.assignee_id, g);
  }
  const groupList = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));

  if (tasks.length === 0) return <EmptyState title="No tasks in this window" />;

  const dayCells = (rowClass = "") =>
    days.map((d, i) => (
      <div
        key={d}
        style={{ gridColumn: i + 1, gridRow: 1 }}
        className={cn(
          "border-r border-gray-100",
          i % 7 >= 5 && "bg-gray-50",
          d === today && "bg-blue-50",
          rowClass,
        )}
      />
    ));

  return (
    <div className="card overflow-x-auto">
      <div style={{ minWidth: 160 + n * COL }} className="text-xs">
        {/* Month header */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="sticky left-0 z-20 w-40 shrink-0 bg-gray-50 sm:w-56" />
          <div className="grid" style={gridStyle}>
            {months.map((m) => (
              <div
                key={m.label}
                style={{ gridColumn: `${m.start + 1} / ${m.end + 2}` }}
                className="truncate border-r border-gray-200 px-2 py-1 font-medium text-gray-700"
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>
        {/* Day header */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="sticky left-0 z-20 w-40 shrink-0 bg-gray-50 px-3 py-1 text-gray-500 sm:w-56">Task</div>
          <div className="grid" style={gridStyle}>
            {days.map((d, i) => {
              const date = parseISO(d);
              return (
                <div
                  key={d}
                  className={cn(
                    "border-r border-gray-100 py-1 text-center leading-tight",
                    i % 7 >= 5 ? "text-gray-400" : "text-gray-600",
                    d === today && "bg-blue-600 font-semibold text-white",
                  )}
                >
                  <div className="text-[9px] uppercase">{format(date, "EEEEE")}</div>
                  <div>{format(date, "d")}</div>
                </div>
              );
            })}
          </div>
        </div>

        {groupList.map((g) => (
          <div key={g.name}>
            <div className="flex border-b border-gray-100 bg-gray-50/60">
              <div className="sticky left-0 z-20 w-40 shrink-0 bg-gray-50 px-3 py-1 font-semibold text-gray-700 sm:w-56">
                {g.name}
              </div>
              <div className="grid" style={gridStyle}>
                {dayCells()}
              </div>
            </div>

            {g.tasks.map((t) => {
              const s = clampIdx(t.start_date);
              const e = clampIdx(t.due_date);
              const done = t.status === "completed" || t.status === "cancelled";
              const overdue = !done && t.due_date < today;
              const tailEnd = overdue ? clampIdx(today) : -1;
              const moved = t.original_due_date !== t.due_date && t.original_due_date >= first && t.original_due_date <= last;
              const barTitle = `${ticketLabel(t.ticket_number)} · ${t.title}\n${formatDate(t.start_date)} → ${formatDate(t.due_date)}${
                moved ? `\nOriginal deadline: ${formatDate(t.original_due_date)}` : ""
              }${overdue ? "\nOVERDUE" : ""}`;

              return (
                <div key={t.id} className="flex border-b border-gray-100">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="sticky left-0 z-20 w-40 shrink-0 truncate bg-surface px-3 py-1.5 hover:bg-gray-50 sm:w-56"
                    title={t.title}
                  >
                    <span className="font-mono text-gray-400">{ticketLabel(t.ticket_number)}</span>{" "}
                    <span className={cn("text-gray-900", done && "text-gray-400 line-through")}>{t.title}</span>
                  </Link>
                  <div className="relative grid h-8" style={gridStyle}>
                    {dayCells()}

                    <Link
                      href={`/tasks/${t.id}`}
                      title={barTitle}
                      style={{
                        gridColumn: `${s + 1} / ${e + 2}`,
                        gridRow: 1,
                        backgroundColor: t.status === "cancelled" ? "var(--color-gray-300)" : t.task_type.color,
                        opacity: t.status === "completed" ? 0.55 : 1,
                      }}
                      className="z-10 my-1.5 truncate rounded px-1.5 text-[10px] font-medium leading-5 text-white"
                    >
                      {t.status === "completed" && "✓ "}
                      {t.title}
                    </Link>

                    {overdue && tailEnd > e && (
                      <div
                        style={{ gridColumn: `${e + 2} / ${tailEnd + 2}`, gridRow: 1 }}
                        className="z-10 my-2.5 rounded-r bg-[repeating-linear-gradient(45deg,#fca5a5_0,#fca5a5_4px,#fee2e2_4px,#fee2e2_8px)] dark:bg-[repeating-linear-gradient(45deg,#b91c1c_0,#b91c1c_4px,#3f1d22_4px,#3f1d22_8px)]"
                        title="Overdue"
                      />
                    )}

                    {moved && (
                      <div
                        style={{ gridColumn: `${idx(t.original_due_date) + 1}`, gridRow: 1 }}
                        className="z-20 flex items-center justify-center"
                        title={`Original deadline: ${formatDate(t.original_due_date)}`}
                      >
                        <span className="block h-2.5 w-2.5 rotate-45 border border-white bg-amber-500" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-6 rounded bg-blue-600" /> planned (start → due)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-6 rounded bg-[repeating-linear-gradient(45deg,#fca5a5_0,#fca5a5_4px,#fee2e2_4px,#fee2e2_8px)] dark:bg-[repeating-linear-gradient(45deg,#b91c1c_0,#b91c1c_4px,#3f1d22_4px,#3f1d22_8px)]" /> overdue
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="block h-2 w-2 rotate-45 bg-amber-500" /> original deadline (moved)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-6 rounded bg-blue-600 opacity-55" /> completed
          </span>
        </div>
      </div>
    </div>
  );
}
