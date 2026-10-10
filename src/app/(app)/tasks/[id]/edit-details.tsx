"use client";

import { useActionState } from "react";
import { updateTaskDetails } from "@/app/actions/tasks";
import { FormError } from "@/components/ui";

export function EditDetails({
  task,
  people,
  isManager,
}: {
  task: { id: string; title: string; description: string; priority: string; assignee_id: string; start_date: string };
  people: { id: string; name: string }[];
  isManager: boolean;
}) {
  const [state, action, pending] = useActionState(updateTaskDetails, null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="task_id" value={task.id} />
      <div>
        <label className="label">Title</label>
        <input name="title" defaultValue={task.title} className="input" required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" defaultValue={task.description} rows={3} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Priority</label>
          <select name="priority" defaultValue={task.priority} className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="label">Start date</label>
          <input name="start_date" type="date" defaultValue={task.start_date} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Assignee {!isManager && <span className="text-gray-400">(manager only)</span>}</label>
        <select name="assignee_id" defaultValue={task.assignee_id} className="input" disabled={!isManager}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <FormError state={state} />
      <div className="flex items-center justify-between">
        {state?.ok && <span className="text-xs text-green-700">Saved</span>}
        <button type="submit" disabled={pending} className="btn-secondary btn-sm ml-auto">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
