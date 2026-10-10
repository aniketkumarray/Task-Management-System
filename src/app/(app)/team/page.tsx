import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { requireManager } from "@/lib/auth";
import { getRecentActivity, getTeamOverview } from "@/lib/queries";
import { formatDate, formatDateTime, todayISO } from "@/lib/dates";
import { Avatar, DueBadge, PageHeader, TicketLink, TypeBadge } from "@/components/ui";

export default async function TeamPage() {
  await requireManager();
  const today = todayISO();
  const [{ members, activeTasks, missingUpdate }, activity] = await Promise.all([
    getTeamOverview(),
    getRecentActivity(30),
  ]);

  const totalOverdue = activeTasks.filter((t) => t.status !== "on_hold" && t.due_date < today).length;
  const dueToday = activeTasks.filter((t) => t.due_date === today).length;
  const employees = members.filter((m) => m.profile.role === "employee" || m.open > 0);

  return (
    <>
      <PageHeader title="Team Overview" subtitle={formatDate(today)} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active tasks" value={activeTasks.length} />
        <Stat label="Due today" value={dueToday} tone={dueToday ? "warn" : undefined} />
        <Stat label="Overdue" value={totalOverdue} tone={totalOverdue ? "bad" : undefined} />
        <Stat label="Missing today's update" value={missingUpdate.length} tone={missingUpdate.length ? "warn" : undefined} />
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">By person</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Member</th>
                <th className="px-3 py-2 font-medium text-right">Active</th>
                <th className="px-3 py-2 font-medium text-right">Due today</th>
                <th className="px-3 py-2 font-medium text-right">Overdue</th>
                <th className="px-3 py-2 font-medium text-right">Needs update</th>
                <th className="px-3 py-2 font-medium text-right">Done (7d)</th>
                <th className="px-3 py-2 font-medium">Last update today</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((m) => (
                <tr key={m.profile.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={m.profile.full_name} size="sm" />
                      <span className="font-medium text-gray-900">{m.profile.full_name}</span>
                      {m.profile.role === "manager" && <span className="badge bg-purple-50 text-purple-700">Manager</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{m.open}</td>
                  <td className="px-3 py-2 text-right">{m.dueToday || <span className="text-gray-300">0</span>}</td>
                  <td className={`px-3 py-2 text-right ${m.overdue ? "font-semibold text-red-600" : ""}`}>
                    {m.overdue || <span className="text-gray-300">0</span>}
                  </td>
                  <td className={`px-3 py-2 text-right ${m.needsUpdate ? "font-semibold text-amber-600" : ""}`}>
                    {m.needsUpdate || <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-green-700">{m.completedLast7 || <span className="text-gray-300">0</span>}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {m.lastUpdateAt ? formatDateTime(m.lastUpdateAt).split(",").pop() : m.open ? <span className="text-amber-600">None yet</span> : "—"}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Link href={`/tasks?assignee=${m.profile.id}`} className="text-xs text-blue-600 hover:underline">
                      Tasks
                    </Link>
                    <span className="mx-1 text-gray-300">·</span>
                    <Link href={`/history?author=${m.profile.id}`} className="text-xs text-blue-600 hover:underline">
                      History
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <AlertCircle size={15} className="text-amber-500" /> Open tasks without an update today
            <span className="font-normal text-gray-400">({missingUpdate.length})</span>
          </h2>
          {missingUpdate.length === 0 ? (
            <div className="card px-4 py-6 text-center text-sm text-gray-500">Everyone is up to date.</div>
          ) : (
            <div className="card divide-y divide-gray-100">
              {missingUpdate
                .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <TicketLink id={t.id} number={t.ticket_number} />
                    <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate font-medium text-gray-900 hover:text-blue-700">
                      {t.title}
                    </Link>
                    <span className="hidden text-xs text-gray-500 sm:inline">{t.assignee.full_name}</span>
                    <DueBadge dueDate={t.due_date} status={t.status} />
                  </div>
                ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Recent activity</h2>
          <div className="card divide-y divide-gray-100">
            {activity.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-500">Nothing yet.</p>}
            {activity.map((u) => (
              <div key={u.id} className="px-4 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-800">{u.author.full_name}</span>
                  <span>{formatDateTime(u.created_at)}</span>
                  <TicketLink id={u.task.id} number={u.task.ticket_number} />
                  <TypeBadge name={u.task.task_type.name} color={u.task.task_type.color} />
                  {u.previous_stage && u.stage && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                      {u.previous_stage.name} → {u.stage.name}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-gray-800">{u.note}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" | "bad" }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold ${tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}
