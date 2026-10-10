"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { saveTaskType, setTaskTypeActive } from "@/app/actions/config";
import { FormError } from "@/components/ui";
import { cn } from "@/lib/utils";

interface TypeData {
  id: string;
  name: string;
  description: string;
  tat_days: number;
  color: string;
  is_active: boolean;
  stages: string[];
}

export function TaskTypeEditor({ type, isNew }: { type?: TypeData; isNew?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveTaskType, null);
  const [togglePending, startToggle] = useTransition();

  if (isNew && !open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full border-dashed">
        <Plus size={15} /> Add a task type
      </button>
    );
  }

  return (
    <div className={cn("card", type && !type.is_active && "opacity-60")}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn-ghost btn-sm -ml-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {type ? (
          <>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: type.color }} />
            <span className="font-medium text-gray-900">{type.name}</span>
            <span className="text-xs text-gray-500">TAT {type.tat_days} working days</span>
            <span className="hidden text-xs text-gray-400 sm:inline">· {type.stages.join(" → ")}</span>
            {!type.is_active && <span className="badge bg-gray-100 text-gray-600">Inactive</span>}
            <button
              type="button"
              disabled={togglePending}
              onClick={() => startToggle(async () => void (await setTaskTypeActive(type.id, !type.is_active)))}
              className="btn-ghost btn-sm ml-auto"
            >
              {type.is_active ? "Deactivate" : "Activate"}
            </button>
          </>
        ) : (
          <span className="font-medium text-gray-900">New task type</span>
        )}
      </div>

      {open && (
        <form action={action} className="space-y-3 border-t border-gray-100 px-4 py-4">
          {type && <input type="hidden" name="id" value={type.id} />}
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_90px]">
            <div>
              <label className="label">Name</label>
              <input name="name" defaultValue={type?.name ?? ""} required className="input" placeholder="e.g. Dashboard" />
            </div>
            <div>
              <label className="label">TAT (working days)</label>
              <input name="tat_days" type="number" min={0} defaultValue={type?.tat_days ?? 3} required className="input" />
            </div>
            <div>
              <label className="label">Colour</label>
              <input name="color" type="color" defaultValue={type?.color ?? "#2563eb"} className="input h-9 p-1" />
            </div>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input name="description" defaultValue={type?.description ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Stages, in order (one per line)</label>
            <textarea
              name="stages"
              rows={5}
              defaultValue={type?.stages.join("\n") ?? "Requirement\nIn progress\nReview\nDelivered"}
              className="input font-mono text-xs"
              required
            />
          </div>
          <FormError state={state} />
          <div className="flex items-center justify-end gap-2">
            {state?.ok && <span className="text-xs text-green-700">Saved</span>}
            {isNew && (
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
            )}
            <button type="submit" disabled={pending} className="btn-primary btn-sm">
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
