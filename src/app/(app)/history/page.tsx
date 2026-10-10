import { format, parseISO, subDays } from "date-fns";
import { requireProfile } from "@/lib/auth";
import { getHistory, getProfiles } from "@/lib/queries";
import { formatDate, formatDateTime, todayISO } from "@/lib/dates";
import { Avatar, EmptyState, PageHeader, TicketLink, TypeBadge } from "@/components/ui";
import { HistoryFilters } from "./history-filters";

export default async function HistoryPage(props: PageProps<"/history">) {
  const profile = await requireProfile();
  const sp = await props.searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const today = todayISO();
  const from = pick("from") || format(subDays(parseISO(today), 6), "yyyy-MM-dd");
  const to = pick("to") || today;
  const isManager = profile.role === "manager";
  const author = isManager ? pick("author") : profile.id;

  const [rows, people] = await Promise.all([
    getHistory({ from, to, authorId: author || undefined }),
    isManager ? getProfiles(false) : Promise.resolve([]),
  ]);

  const byDate = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byDate.get(r.update_date) ?? [];
    list.push(r);
    byDate.set(r.update_date, list);
  }
  const taskCount = new Set(rows.map((r) => r.task_id)).size;
  const hours = rows.reduce((s, r) => s + (Number(r.hours_spent) || 0), 0);

  return (
    <>
      <PageHeader
        title="History"
        subtitle={`${rows.length} updates · ${taskCount} tasks${hours ? ` · ${hours}h logged` : ""} · ${formatDate(from)} – ${formatDate(to)}`}
      />

      <HistoryFilters
        from={from}
        to={to}
        author={author}
        people={isManager ? people.map((p) => ({ id: p.id, name: p.full_name })) : undefined}
      />

      {rows.length === 0 ? (
        <EmptyState title="No updates in this range" />
      ) : (
        <div className="space-y-5">
          {[...byDate.entries()].map(([date, list]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                {formatDate(date)} <span className="font-normal text-gray-400">({list.length})</span>
              </h2>
              <div className="card divide-y divide-gray-100">
                {list.map((u) => (
                  <div key={u.id} className="flex gap-3 px-4 py-3 text-sm">
                    <Avatar name={u.author.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-800">{u.author.full_name}</span>
                        <span>{formatDateTime(u.created_at).split(",").pop()}</span>
                        <TicketLink id={u.task.id} number={u.task.ticket_number} />
                        <span className="text-gray-700">{u.task.title}</span>
                        <TypeBadge name={u.task.task_type.name} color={u.task.task_type.color} />
                        {u.previous_stage && u.stage && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                            {u.previous_stage.name} → {u.stage.name}
                          </span>
                        )}
                        {u.hours_spent != null && <span>{u.hours_spent}h</span>}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-gray-800">{u.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
