import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MessageSquare } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getDeadlineChanges, getProfiles, getTaskById, getTaskTypesWithStages, getTaskUpdates } from "@/lib/queries";
import { formatDate, formatDateTime } from "@/lib/dates";
import { ticketLabel } from "@/lib/utils";
import { Avatar, DueBadge, PriorityBadge, StageProgress, StatusBadge, TypeBadge } from "@/components/ui";
import { QuickUpdate } from "@/components/quick-update";
import { TaskActions } from "./task-actions";
import { EditDetails } from "./edit-details";

export default async function TaskPage(props: PageProps<"/tasks/[id]">) {
  const { id } = await props.params;
  const profile = await requireProfile();

  const task = await getTaskById(id);
  if (!task) notFound();

  const [updates, deadlineChanges, types, people] = await Promise.all([
    getTaskUpdates(id),
    getDeadlineChanges(id),
    getTaskTypesWithStages(true),
    getProfiles(),
  ]);
  const stages = types.find((t) => t.id === task.task_type_id)?.task_stages ?? [];
  const isManager = profile.role === "manager";
  const canEdit = isManager || task.assignee_id === profile.id || task.created_by === profile.id;
  const isActive = task.status === "open" || task.status === "on_hold";

  const timeline = [
    ...updates.map((u) => ({ kind: "update" as const, at: u.created_at, data: u })),
    ...deadlineChanges.map((d) => ({ kind: "deadline" as const, at: d.created_at, data: d })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <>
      <Link href="/tasks" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={14} /> All tasks
      </Link>

      <div className="card mb-4 p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-gray-500">{ticketLabel(task.ticket_number)}</span>
          <TypeBadge name={task.task_type.name} color={task.task_type.color} />
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <DueBadge dueDate={task.due_date} status={task.status} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{task.title}</h1>
        {task.description && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{task.description}</p>}

        <div className="mt-4">
          <StageProgress stages={stages} currentId={task.current_stage_id} color={task.task_type.color} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-gray-500">Assignee</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-gray-900">
              <Avatar name={task.assignee.full_name} size="sm" /> {task.assignee.full_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Start</dt>
            <dd className="mt-0.5 text-gray-900">{formatDate(task.start_date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Due</dt>
            <dd className="mt-0.5 text-gray-900">
              {formatDate(task.due_date)}
              {task.due_date !== task.original_due_date && (
                <span className="ml-1 text-xs text-amber-700" title="Original deadline">
                  (was {formatDate(task.original_due_date)})
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">TAT</dt>
            <dd className="mt-0.5 text-gray-900">{task.task_type.tat_days} working days</dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {canEdit && isActive && (
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Post today&apos;s update</h2>
              <QuickUpdate
                taskId={task.id}
                currentStageId={task.current_stage_id}
                dueDate={task.due_date}
                stages={stages}
                variant="full"
              />
            </div>
          )}

          <div className="card">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
              Activity <span className="font-normal text-gray-400">({timeline.length})</span>
            </h2>
            {timeline.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">No updates yet.</p>
            ) : (
              <ol className="divide-y divide-gray-100">
                {timeline.map((item) =>
                  item.kind === "update" ? (
                    <li key={item.data.id} className="flex gap-3 px-4 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <MessageSquare size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-800">{item.data.author.full_name}</span>
                          <span>{formatDateTime(item.data.created_at)}</span>
                          {item.data.previous_stage && item.data.stage && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                              {item.data.previous_stage.name} → {item.data.stage.name}
                            </span>
                          )}
                          {item.data.hours_spent != null && <span>{item.data.hours_spent}h</span>}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{item.data.note}</p>
                      </div>
                    </li>
                  ) : (
                    <li key={item.data.id} className="flex gap-3 bg-amber-50/40 px-4 py-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <CalendarClock size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-800">{item.data.changed_by_profile.full_name}</span>
                          <span>{formatDateTime(item.data.created_at)}</span>
                          <span className="font-medium text-amber-800">
                            Deadline {formatDate(item.data.old_due_date)} → {formatDate(item.data.new_due_date)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-800">
                          <span className="text-gray-500">Reason:</span> {item.data.reason}
                        </p>
                      </div>
                    </li>
                  ),
                )}
              </ol>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {canEdit && (
            <div className="card p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Actions</h2>
              <TaskActions taskId={task.id} status={task.status} isManager={isManager} />
            </div>
          )}
          {canEdit && (
            <div className="card p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Edit details</h2>
              <EditDetails
                task={{
                  id: task.id,
                  title: task.title,
                  description: task.description ?? "",
                  priority: task.priority,
                  assignee_id: task.assignee_id,
                  start_date: task.start_date,
                }}
                people={people.map((p) => ({ id: p.id, name: p.full_name }))}
                isManager={isManager}
              />
            </div>
          )}
          <div className="card p-4 text-xs text-gray-500">
            <p>Created {formatDateTime(task.created_at)}</p>
            {task.completed_at && <p>Completed {formatDateTime(task.completed_at)}</p>}
            <p>Last update {formatDateTime(task.last_update_at)}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
