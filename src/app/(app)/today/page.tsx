import Link from "next/link";
import { AlertTriangle, BellRing, CheckCircle2, Plus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { getHistory, getTaskIdsUpdatedToday, getTasks, getTaskTypesWithStages } from "@/lib/queries";
import { formatDate, formatDateTime, isWorkingDayToday, todayISO } from "@/lib/dates";
import { DueBadge, EmptyState, PageHeader, StageProgress, TicketLink, TypeBadge } from "@/components/ui";
import { QuickUpdate } from "@/components/quick-update";
import type { TaskWithRelations } from "@/lib/types";

export default async function TodayPage() {
  const profile = await requireProfile();
  const today = todayISO();

  const [tasks, types, myUpdatesToday] = await Promise.all([
    getTasks({ assigneeId: profile.id, status: "active" }),
    getTaskTypesWithStages(true),
    getHistory({ from: today, to: today, authorId: profile.id }),
  ]);
  const updatedToday = await getTaskIdsUpdatedToday(tasks.map((t) => t.id));
  const stagesByType = new Map(types.map((t) => [t.id, t.task_stages]));

  const open = tasks.filter((t) => t.status === "open");
  const onHold = tasks.filter((t) => t.status === "on_hold");
  const needsUpdate = open.filter((t) => !updatedToday.has(t.id));
  const done = open.filter((t) => updatedToday.has(t.id));
  const overdue = open.filter((t) => t.due_date < today).length;
  const workingDay = isWorkingDayToday();

  return (
    <>
      <PageHeader
        title="My Day"
        subtitle={formatDate(today)}
        actions={
          <Link href="/tasks/new" className="btn-primary">
            <Plus size={16} /> New task
          </Link>
        }
      />

      {needsUpdate.length > 0 ? (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <BellRing size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">
              {needsUpdate.length} task{needsUpdate.length > 1 ? "s" : ""} still need{needsUpdate.length === 1 ? "s" : ""} an
              update today{overdue > 0 ? ` · ${overdue} overdue` : ""}.
            </p>
            <p className="text-amber-800">
              {workingDay
                ? "Post a one-liner on each before you log off. Ctrl+Enter posts instantly."
                : "It's a non-working day — update only if you worked on something."}
            </p>
          </div>
        </div>
      ) : open.length > 0 ? (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <CheckCircle2 size={18} className="shrink-0 text-green-600" />
          <p className="font-medium">All your open tasks are updated for today. Nice.</p>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open tasks" value={open.length} />
        <Stat label="Need update" value={needsUpdate.length} tone={needsUpdate.length ? "warn" : undefined} />
        <Stat label="Overdue" value={overdue} tone={overdue ? "bad" : undefined} />
        <Stat label="Updates posted today" value={myUpdatesToday.length} />
      </div>

      {tasks.length === 0 && (
        <EmptyState
          title="No active tasks assigned to you"
          hint="Create one, or ask your manager to assign work to you."
          action={
            <Link href="/tasks/new" className="btn-primary btn-sm">
              <Plus size={14} /> New task
            </Link>
          }
        />
      )}

      {needsUpdate.length > 0 && (
        <Section title="Needs update today" count={needsUpdate.length}>
          {needsUpdate.map((t) => (
            <TaskCard key={t.id} task={t} stages={stagesByType.get(t.task_type_id) ?? []} />
          ))}
        </Section>
      )}

      {done.length > 0 && (
        <Section title="Updated today" count={done.length} muted>
          {done.map((t) => (
            <TaskCard key={t.id} task={t} stages={stagesByType.get(t.task_type_id) ?? []} updated />
          ))}
        </Section>
      )}

      {onHold.length > 0 && (
        <Section title="On hold" count={onHold.length} muted>
          {onHold.map((t) => (
            <TaskCard key={t.id} task={t} stages={stagesByType.get(t.task_type_id) ?? []} />
          ))}
        </Section>
      )}

      {myUpdatesToday.length > 0 && (
        <Section title="What you posted today" count={myUpdatesToday.length} muted>
          <div className="card divide-y divide-gray-100">
            {myUpdatesToday.map((u) => (
              <div key={u.id} className="flex gap-3 px-4 py-2.5 text-sm">
                <span className="w-14 shrink-0 text-xs text-gray-400">{formatDateTime(u.created_at).split(",").pop()}</span>
                <div className="min-w-0 flex-1">
                  <TicketLink id={u.task.id} number={u.task.ticket_number} /> <span className="text-gray-700">{u.task.title}</span>
                  <p className="text-gray-600">{u.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
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

function Section({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className={`mb-2 text-sm font-semibold ${muted ? "text-gray-500" : "text-gray-900"}`}>
        {title} <span className="font-normal text-gray-400">({count})</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function TaskCard({
  task,
  stages,
  updated,
}: {
  task: TaskWithRelations;
  stages: { id: string; name: string; position: number }[];
  updated?: boolean;
}) {
  const isOverdue = task.status === "open" && task.due_date < todayISO();
  return (
    <div className={`card p-4 ${updated ? "opacity-80" : ""} ${isOverdue ? "border-l-4 border-l-red-400" : ""}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TicketLink id={task.id} number={task.ticket_number} />
        <Link href={`/tasks/${task.id}`} className="font-medium text-gray-900 hover:text-blue-700">
          {task.title}
        </Link>
        <TypeBadge name={task.task_type.name} color={task.task_type.color} />
        <DueBadge dueDate={task.due_date} status={task.status} />
        {isOverdue && <AlertTriangle size={14} className="text-red-500" />}
      </div>
      <div className="mb-3">
        <StageProgress stages={stages} currentId={task.current_stage_id} color={task.task_type.color} />
      </div>
      <QuickUpdate taskId={task.id} currentStageId={task.current_stage_id} dueDate={task.due_date} stages={stages} />
    </div>
  );
}
