"use client";

import { useActionState, useState } from "react";
import { createTask } from "@/app/actions/tasks";
import { addBusinessDays } from "@/lib/dates";
import { FormError } from "@/components/ui";

interface TypeOpt {
  id: string;
  name: string;
  tat_days: number;
  stages: string[];
}

export function NewTaskForm({
  types,
  people,
  me,
  isManager,
  today,
}: {
  types: TypeOpt[];
  people: { id: string; name: string }[];
  me: string;
  isManager: boolean;
  today: string;
}) {
  const [state, action, pending] = useActionState(createTask, null);
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [startDate, setStartDate] = useState(today);
  const [manualDue, setManualDue] = useState<string | null>(null);

  const type = types.find((t) => t.id === typeId);
  const autoDue = type ? addBusinessDays(startDate, type.tat_days) : "";
  const dueTouched = manualDue !== null;
  const dueDate = manualDue ?? autoDue;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" required autoFocus className="input" placeholder="e.g. Weekly sales dashboard for North region" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="task_type_id">Task type</label>
          <select id="task_type_id" name="task_type_id" value={typeId} onChange={(e) => setTypeId(e.target.value)} className="input" required>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · TAT {t.tat_days}d
              </option>
            ))}
          </select>
          {type && (
            <p className="mt-1 text-xs text-gray-500">
              Stages: {type.stages.join(" → ") || "none configured"}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="assignee_id">Assignee</label>
          <select id="assignee_id" name="assignee_id" defaultValue={me} className="input" disabled={!isManager}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {!isManager && <input type="hidden" name="assignee_id" value={me} />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="start_date">Start date</label>
          <input id="start_date" name="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="due_date">
            Due date {type && !dueTouched && <span className="text-gray-400">(auto: +{type.tat_days} working days)</span>}
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setManualDue(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="priority">Priority</label>
          <select id="priority" name="priority" defaultValue="medium" className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="description">Description (optional)</label>
        <textarea id="description" name="description" rows={3} className="input" placeholder="Context, source links, requester, acceptance criteria…" />
      </div>

      <FormError state={state} />

      <div className="flex justify-end gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creating…" : "Create task"}
        </button>
      </div>
    </form>
  );
}
