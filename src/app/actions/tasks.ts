"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { addBusinessDays, todayISO } from "@/lib/dates";
import type { ActionResult, Priority, TaskStatus } from "@/lib/types";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function createTask(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const title = str(formData, "title");
  const description = str(formData, "description") || null;
  const taskTypeId = str(formData, "task_type_id");
  const assigneeId = str(formData, "assignee_id") || profile.id;
  const startDate = str(formData, "start_date") || todayISO();
  const priority = (str(formData, "priority") || "medium") as Priority;
  let dueDate = str(formData, "due_date");

  if (!title) return { ok: false, error: "Title is required." };
  if (!taskTypeId) return { ok: false, error: "Pick a task type." };
  if (profile.role !== "manager" && assigneeId !== profile.id) {
    return { ok: false, error: "Only managers can assign tasks to others." };
  }

  const { data: type } = await supabase
    .from("task_types")
    .select("tat_days, task_stages(id, position)")
    .eq("id", taskTypeId)
    .single();
  if (!type) return { ok: false, error: "Task type not found." };

  if (!dueDate) dueDate = addBusinessDays(startDate, type.tat_days as number);
  if (dueDate < startDate) return { ok: false, error: "Due date cannot be before the start date." };

  const stages = (type.task_stages as { id: string; position: number }[]).sort(
    (a, b) => a.position - b.position,
  );

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      task_type_id: taskTypeId,
      assignee_id: assigneeId,
      created_by: profile.id,
      current_stage_id: stages[0]?.id ?? null,
      priority,
      start_date: startDate,
      due_date: dueDate,
      original_due_date: dueDate,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateAll();
  redirect(`/tasks/${data.id}`);
}

export interface PostUpdateInput {
  taskId: string;
  note: string;
  stageId?: string | null;
  hoursSpent?: number | null;
  newDueDate?: string | null;
  deadlineReason?: string | null;
  markComplete?: boolean;
}

/**
 * The one action behind every "quick update" form. Does everything in one go:
 * posts the note, moves the stage, logs a deadline change (with reason) and
 * optionally completes the task.
 */
export async function postUpdate(input: PostUpdateInput): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const note = input.note.trim();

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("id, current_stage_id, due_date, status, assignee_id, created_by")
    .eq("id", input.taskId)
    .single();
  if (taskErr || !task) return { ok: false, error: "Task not found." };

  if (profile.role !== "manager" && task.assignee_id !== profile.id && task.created_by !== profile.id) {
    return { ok: false, error: "You can only update your own tasks." };
  }

  const stageChanged = Boolean(input.stageId && input.stageId !== task.current_stage_id);
  const deadlineChanged = Boolean(input.newDueDate && input.newDueDate !== task.due_date);

  if (!note && !input.markComplete && !stageChanged && !deadlineChanged) {
    return { ok: false, error: "Write a short update first." };
  }

  const taskPatch: Record<string, unknown> = {};
  if (stageChanged) taskPatch.current_stage_id = input.stageId;

  if (deadlineChanged) {
    const reason = (input.deadlineReason ?? "").trim();
    if (!reason) return { ok: false, error: "Please give a reason for changing the deadline." };

    const { error } = await supabase.from("deadline_changes").insert({
      task_id: task.id,
      changed_by: profile.id,
      old_due_date: task.due_date,
      new_due_date: input.newDueDate,
      reason,
    });
    if (error) return { ok: false, error: error.message };
    taskPatch.due_date = input.newDueDate;
  }

  if (input.markComplete) {
    taskPatch.status = "completed";
    taskPatch.completed_at = new Date().toISOString();
  } else if (task.status === "on_hold" && (note || stageChanged)) {
    taskPatch.status = "open";
  }

  const finalNote =
    note ||
    (input.markComplete
      ? "Marked as completed."
      : stageChanged
        ? "Moved to next stage."
        : "Deadline updated.");

  const { error: updErr } = await supabase.from("task_updates").insert({
    task_id: task.id,
    author_id: profile.id,
    update_date: todayISO(),
    note: finalNote,
    stage_id: input.stageId ?? task.current_stage_id,
    previous_stage_id: stageChanged ? task.current_stage_id : null,
    hours_spent: input.hoursSpent ?? null,
  });
  if (updErr) return { ok: false, error: updErr.message };

  if (Object.keys(taskPatch).length > 0) {
    const { error } = await supabase.from("tasks").update(taskPatch).eq("id", task.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidateAll();
  return { ok: true, id: task.id };
}

export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const patch: Record<string, unknown> = { status };
  patch.completed_at = status === "completed" ? new Date().toISOString() : null;

  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("task_updates").insert({
    task_id: taskId,
    author_id: profile.id,
    update_date: todayISO(),
    note: `Status changed to ${status.replace("_", " ")}.`,
  });

  revalidateAll();
  return { ok: true };
}

export async function updateTaskDetails(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const taskId = str(formData, "task_id");
  const title = str(formData, "title");
  const description = str(formData, "description") || null;
  const priority = str(formData, "priority") as Priority;
  const assigneeId = str(formData, "assignee_id");
  const startDate = str(formData, "start_date");

  if (!title) return { ok: false, error: "Title is required." };
  if (profile.role !== "manager") {
    const { data: t } = await supabase.from("tasks").select("assignee_id").eq("id", taskId).single();
    if (t && assigneeId && assigneeId !== t.assignee_id) {
      return { ok: false, error: "Only managers can reassign tasks." };
    }
  }

  const patch: Record<string, unknown> = { title, description, priority };
  if (assigneeId) patch.assignee_id = assigneeId;
  if (startDate) patch.start_date = startDate;

  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "manager") return { ok: false, error: "Only managers can delete tasks." };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { ok: false, error: error.message };

  revalidateAll();
  redirect("/tasks");
}
