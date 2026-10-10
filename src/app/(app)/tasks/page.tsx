import Link from "next/link";
import { Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getProfiles, getTasks, getTaskTypesWithStages } from "@/lib/queries";
import { formatDateShort, todayISO, toDateISO } from "@/lib/dates";
import { Avatar, DueBadge, EmptyState, PageHeader, PriorityBadge, StatusBadge, TicketLink, TypeBadge } from "@/components/ui";
import { TaskFilters } from "./task-filters";
import { ticketLabel } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

export default async function TasksPage(props: PageProps<"/tasks">) {
  const profile = await requireProfile();
  const sp = await props.searchParams;

  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const assignee = pick("assignee") || (profile.role === "manager" ? "" : profile.id);
  const typeId = pick("type");
  const status = (pick("status") || "active") as TaskStatus | "active" | "all";
  const search = pick("q");
  const overdue = pick("overdue") === "1";

  const [tasks, types, people] = await Promise.all([
    getTasks({ assigneeId: assignee || undefined, typeId: typeId || undefined, status, search, overdueOnly: overdue }),
    getTaskTypesWithStages(true),
    getProfiles(),
  ]);
  const today = todayISO();

  return (
    <>
      <PageHeader
        title="All Tasks"
        subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
        actions={
          <Link href="/tasks/new" className="btn-primary">
            <Plus size={16} /> New task
          </Link>
        }
      />

      <TaskFilters
        people={people.map((p) => ({ id: p.id, name: p.full_name }))}
        types={types.map((t) => ({ id: t.id, name: t.name }))}
        value={{ assignee, type: typeId, status, q: search, overdue }}
      />

      {tasks.length === 0 ? (
        <EmptyState title="No tasks match these filters" />
      ) : (
        <>
        <ul className="space-y-2 md:hidden">
          {tasks.map((t) => {
            const updatedToday = t.last_update_at && toDateISO(t.last_update_at) === today;
            return (
              <li key={t.id} className="card p-3">
                <Link href={`/tasks/${t.id}`} className="block">
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">{ticketLabel(t.ticket_number)}</span>
                    <TypeBadge name={t.task_type.name} color={t.task_type.color} />
                    <span className="ml-auto">
                      <StatusBadge status={t.status} />
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{t.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Avatar name={t.assignee.full_name} size="sm" /> {t.assignee.full_name}
                    </span>
                    <span>{t.current_stage?.name ?? "—"}</span>
                    <DueBadge dueDate={t.due_date} status={t.status} />
                    <span className={updatedToday ? "text-green-700" : "text-gray-400"}>
                      {t.last_update_at ? (updatedToday ? "Updated today" : `Updated ${toDateISO(t.last_update_at)}`) : "No updates"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="card hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Ticket</th>
                <th className="px-3 py-2 font-medium">Task</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Assignee</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Last update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => {
                const updatedToday = t.last_update_at && toDateISO(t.last_update_at) === today;
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <TicketLink id={t.id} number={t.ticket_number} />
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/tasks/${t.id}`} className="font-medium text-gray-900 hover:text-blue-700">
                        {t.title}
                      </Link>
                      <span className="ml-2 inline-block align-middle">
                        <PriorityBadge priority={t.priority} />
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <TypeBadge name={t.task_type.name} color={t.task_type.color} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={t.assignee.full_name} size="sm" />
                        <span className="text-gray-700">{t.assignee.full_name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">{t.current_stage?.name ?? "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <DueBadge dueDate={t.due_date} status={t.status} />
                      {(t.status === "completed" || t.status === "cancelled") && (
                        <span className="text-xs text-gray-500">{formatDateShort(t.due_date)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {t.last_update_at ? (
                        <span className={updatedToday ? "text-green-700" : "text-gray-500"}>
                          {updatedToday ? "Today" : toDateISO(t.last_update_at)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </>
  );
}
