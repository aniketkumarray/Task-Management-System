"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarClock, Check, CheckCircle2, Send } from "lucide-react";
import { postUpdate } from "@/app/actions/tasks";
import { cn } from "@/lib/utils";
import type { TaskStage } from "@/lib/types";

interface Props {
  taskId: string;
  currentStageId: string | null;
  dueDate: string;
  stages: Pick<TaskStage, "id" | "name" | "position">[];
  /** Compact = inline on My Day; full = on the ticket page */
  variant?: "compact" | "full";
  onDone?: () => void;
}

export function QuickUpdate({ taskId, currentStageId, dueDate, stages, variant = "compact", onDone }: Props) {
  const [note, setNote] = useState("");
  const [stageId, setStageId] = useState(currentStageId ?? "");
  const [hours, setHours] = useState("");
  const [changeDeadline, setChangeDeadline] = useState(false);
  const [newDue, setNewDue] = useState(dueDate);
  const [reason, setReason] = useState("");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const currentIdx = stages.findIndex((s) => s.id === currentStageId);
  const nextStage = currentIdx >= 0 ? stages[currentIdx + 1] : undefined;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await postUpdate({
        taskId,
        note,
        stageId: stageId || null,
        hoursSpent: hours ? Number(hours) : null,
        newDueDate: changeDeadline ? newDue : null,
        deadlineReason: changeDeadline ? reason : null,
        markComplete: complete,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setNote("");
      setHours("");
      setChangeDeadline(false);
      setReason("");
      setComplete(false);
      onDone?.();
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cn("space-y-2", variant === "full" && "space-y-3")}
    >
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        rows={variant === "compact" ? 2 : 3}
        placeholder="What did you do on this today? (Ctrl+Enter to post)"
        className="input resize-y"
      />

      <div className="flex flex-wrap items-center gap-2">
        {stages.length > 0 && (
          <select
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="input w-auto min-w-36 py-1.5 text-xs"
            title="Stage"
          >
            {!currentStageId && <option value="">No stage</option>}
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {nextStage && stageId === currentStageId && (
          <button
            type="button"
            onClick={() => setStageId(nextStage.id)}
            className="btn-secondary btn-sm"
            title={`Move to ${nextStage.name}`}
          >
            Next: {nextStage.name} →
          </button>
        )}

        <input
          type="number"
          step="0.5"
          min="0"
          max="24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="hrs"
          className="input w-16 py-1.5 text-xs"
          title="Hours spent (optional)"
        />

        <button
          type="button"
          onClick={() => setChangeDeadline((v) => !v)}
          className={cn("btn-secondary btn-sm", changeDeadline && "border-amber-400 bg-amber-50 text-amber-800")}
        >
          <CalendarClock size={13} /> Deadline
        </button>

        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
            complete ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300 bg-white text-gray-700",
          )}
        >
          <input type="checkbox" checked={complete} onChange={(e) => setComplete(e.target.checked)} className="sr-only" />
          <CheckCircle2 size={13} /> Complete
        </label>

        <button type="submit" disabled={pending} className="btn-primary btn-sm ml-auto">
          {saved ? (
            <>
              <Check size={13} /> Posted
            </>
          ) : (
            <>
              <Send size={13} /> {pending ? "Posting…" : "Post update"}
            </>
          )}
        </button>
      </div>

      {changeDeadline && (
        <div className="grid gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-2 sm:grid-cols-[auto_1fr]">
          <div>
            <label className="label">New due date</label>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="input py-1.5 text-xs" />
          </div>
          <div>
            <label className="label">Reason for the change (required)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Source data delayed by 2 days"
              className="input py-1.5 text-xs"
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
