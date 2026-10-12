import Link from "next/link";
import { cn, initials, PRIORITY_LABEL, STATUS_LABEL, ticketLabel } from "@/lib/utils";
import { dueLabel } from "@/lib/dates";
import type { ActionResult, Priority, TaskStatus } from "@/lib/types";

export function FormError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-6 w-6 text-[10px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-700",
        sz,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function TypeBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="badge type-badge border" style={{ "--c": color } as React.CSSProperties}>
      {name}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const tone: Record<TaskStatus, string> = {
    open: "bg-blue-50 text-blue-700",
    on_hold: "bg-amber-50 text-amber-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return <span className={cn("badge", tone[status])}>{STATUS_LABEL[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone: Record<Priority, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-sky-50 text-sky-700",
    high: "bg-red-50 text-red-700",
  };
  return <span className={cn("badge", tone[priority])}>{PRIORITY_LABEL[priority]}</span>;
}

export function DueBadge({ dueDate, status }: { dueDate: string; status: TaskStatus }) {
  if (status === "completed" || status === "cancelled") return null;
  const { text, tone } = dueLabel(dueDate);
  const cls = {
    overdue: "bg-red-100 text-red-800",
    today: "bg-amber-100 text-amber-800",
    soon: "bg-amber-50 text-amber-700",
    ok: "bg-gray-100 text-gray-600",
  }[tone];
  return <span className={cn("badge", cls)}>{text}</span>;
}

export function TicketLink({ id, number, className }: { id: string; number: number; className?: string }) {
  return (
    <Link href={`/tasks/${id}`} className={cn("font-mono text-xs text-gray-500 hover:text-blue-600", className)}>
      {ticketLabel(number)}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-800">{title}</p>
      {hint && <p className="max-w-sm text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function StageProgress({
  stages,
  currentId,
  color,
}: {
  stages: { id: string; name: string }[];
  currentId: string | null;
  color: string;
}) {
  const idx = stages.findIndex((s) => s.id === currentId);
  return (
    <ol className="flex flex-wrap items-center gap-1">
      {stages.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const active = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-1">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs",
                active && "font-semibold text-white",
                done && "border-transparent bg-gray-200 text-gray-600",
                !active && !done && "border-gray-200 bg-surface text-gray-400",
              )}
              style={active ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {s.name}
            </span>
            {i < stages.length - 1 && <span className="text-gray-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
