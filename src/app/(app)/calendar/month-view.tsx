import Link from "next/link";
import { format, parseISO } from "date-fns";
import { cn, ticketLabel } from "@/lib/utils";
import { Avatar, DueBadge, EmptyState, TypeBadge } from "@/components/ui";
import type { TaskWithRelations } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function chipClass(t: TaskWithRelations, today: string) {
  const done = t.status === "completed" || t.status === "cancelled";
  if (done) return "bg-gray-100 text-gray-400 line-through";
  if (t.due_date < today) return "bg-red-50 text-red-700 border border-red-200";
  return "text-white";
}

export function MonthView({
  days,
  month,
  tasks,
  today,
}: {
  days: string[];
  month: string;
  tasks: TaskWithRelations[];
  today: string;
}) {
  const byDue = new Map<string, TaskWithRelations[]>();
  for (const t of tasks) {
    const list = byDue.get(t.due_date) ?? [];
    list.push(t);
    byDue.set(t.due_date, list);
  }
  const inMonth = days.filter((d) => d.startsWith(month));
  const agendaDays = inMonth.filter((d) => byDue.has(d));

  return (
    <>
      {/* Desktop / tablet: month grid */}
      <div className="card hidden overflow-hidden sm:block">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const list = byDue.get(d) ?? [];
            const isToday = d === today;
            const outside = !d.startsWith(month);
            const weekend = i % 7 >= 5;
            return (
              <div
                key={d}
                className={cn(
                  "min-h-24 border-b border-r border-gray-100 p-1.5 align-top",
                  i % 7 === 6 && "border-r-0",
                  (outside || weekend) && "bg-gray-50/70",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday ? "bg-blue-600 font-semibold text-white" : outside ? "text-gray-300" : "text-gray-700",
                    )}
                  >
                    {format(parseISO(d), "d")}
                  </span>
                  {list.length > 0 && <span className="text-[10px] text-gray-400">{list.length}</span>}
                </div>
                <ul className="space-y-0.5">
                  {list.slice(0, MAX_CHIPS).map((t) => {
                    const cls = chipClass(t, today);
                    const colored = cls === "text-white";
                    return (
                      <li key={t.id}>
                        <Link
                          href={`/tasks/${t.id}`}
                          title={`${ticketLabel(t.ticket_number)} · ${t.title} · ${t.assignee.full_name}`}
                          className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] leading-4", cls)}
                          style={colored ? { backgroundColor: t.task_type.color } : undefined}
                        >
                          {t.title}
                        </Link>
                      </li>
                    );
                  })}
                  {list.length > MAX_CHIPS && (
                    <li className="px-1.5 text-[10px] text-gray-500">+{list.length - MAX_CHIPS} more</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone: agenda list for the month */}
      <div className="space-y-4 sm:hidden">
        {agendaDays.length === 0 && <EmptyState title="Nothing due this month" />}
        {agendaDays.map((d) => (
          <section key={d}>
            <h3 className={cn("mb-1.5 text-xs font-semibold", d === today ? "text-blue-700" : "text-gray-600")}>
              {format(parseISO(d), "EEE d MMM")}
              {d === today && " · Today"}
            </h3>
            <ul className="card divide-y divide-gray-100">
              {(byDue.get(d) ?? []).map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center gap-2 px-3 py-2.5">
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: t.task_type.color }} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", t.status === "completed" ? "text-gray-400 line-through" : "text-gray-900")}>
                        {t.title}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Avatar name={t.assignee.full_name} size="sm" /> {t.assignee.full_name}
                        <TypeBadge name={t.task_type.name} color={t.task_type.color} />
                      </p>
                    </div>
                    <DueBadge dueDate={t.due_date} status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
