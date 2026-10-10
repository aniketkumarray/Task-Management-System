"use client";

import { useState, useTransition } from "react";
import { deleteTask, setTaskStatus } from "@/app/actions/tasks";
import type { TaskStatus } from "@/lib/types";

export function TaskActions({ taskId, status, isManager }: { taskId: string; status: TaskStatus; isManager: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: TaskStatus) {
    setError(null);
    startTransition(async () => {
      const res = await setTaskStatus(taskId, next);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && (
        <>
          <button className="btn-secondary btn-sm" disabled={pending} onClick={() => change("on_hold")}>
            Put on hold
          </button>
          <button className="btn-secondary btn-sm" disabled={pending} onClick={() => change("completed")}>
            Mark completed
          </button>
        </>
      )}
      {status === "on_hold" && (
        <button className="btn-secondary btn-sm" disabled={pending} onClick={() => change("open")}>
          Resume
        </button>
      )}
      {(status === "completed" || status === "cancelled") && (
        <button className="btn-secondary btn-sm" disabled={pending} onClick={() => change("open")}>
          Reopen
        </button>
      )}
      {status !== "cancelled" && status !== "completed" && (
        <button className="btn-danger btn-sm" disabled={pending} onClick={() => change("cancelled")}>
          Cancel task
        </button>
      )}
      {isManager && (
        <button
          className="btn-danger btn-sm"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this task and all its history? This cannot be undone.")) {
              startTransition(async () => {
                const res = await deleteTask(taskId);
                if (res && !res.ok) setError(res.error);
              });
            }
          }}
        >
          Delete
        </button>
      )}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
