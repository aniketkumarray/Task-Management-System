import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import type {
  DeadlineChangeWithRelations,
  Profile,
  TaskStatus,
  TaskTypeWithStages,
  TaskUpdateWithRelations,
  TaskWithRelations,
} from "@/lib/types";

export const TASK_SELECT = `
  *,
  task_type:task_types(id, name, color, tat_days),
  assignee:profiles!tasks_assignee_id_fkey(id, full_name, email),
  current_stage:task_stages!tasks_current_stage_id_fkey(id, name, position)
`;

export async function getTaskTypesWithStages(includeInactive = false) {
  const supabase = await createClient();
  let q = supabase
    .from("task_types")
    .select("*, task_stages(*)")
    .order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
  const types = (data ?? []) as TaskTypeWithStages[];
  for (const t of types) t.task_stages.sort((a, b) => a.position - b.position);
  return types;
}

export async function getProfiles(activeOnly = true) {
  const supabase = await createClient();
  let q = supabase.from("profiles").select("*").order("full_name");
  if (activeOnly) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []) as Profile[];
}

export interface TaskFilters {
  assigneeId?: string;
  typeId?: string;
  status?: TaskStatus | "active" | "all";
  search?: string;
  overdueOnly?: boolean;
}

export async function getTasks(filters: TaskFilters = {}) {
  const supabase = await createClient();
  let q = supabase.from("tasks").select(TASK_SELECT);

  if (filters.assigneeId) q = q.eq("assignee_id", filters.assigneeId);
  if (filters.typeId) q = q.eq("task_type_id", filters.typeId);

  const status = filters.status ?? "active";
  if (status === "active") q = q.in("status", ["open", "on_hold"]);
  else if (status !== "all") q = q.eq("status", status);

  if (filters.overdueOnly) q = q.lt("due_date", todayISO()).in("status", ["open", "on_hold"]);
  if (filters.search) q = q.ilike("title", `%${filters.search}%`);

  const { data } = await q.order("due_date", { ascending: true }).order("created_at", { ascending: false });
  return (data ?? []) as TaskWithRelations[];
}

export async function getTaskById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select(TASK_SELECT).eq("id", id).maybeSingle();
  return (data as TaskWithRelations | null) ?? null;
}

export async function getTaskUpdates(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_updates")
    .select(
      `*,
       author:profiles!task_updates_author_id_fkey(id, full_name),
       stage:task_stages!task_updates_stage_id_fkey(id, name),
       previous_stage:task_stages!task_updates_previous_stage_id_fkey(id, name)`,
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  return (data ?? []) as TaskUpdateWithRelations[];
}

export async function getDeadlineChanges(taskId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deadline_changes")
    .select(`*, changed_by_profile:profiles!deadline_changes_changed_by_fkey(id, full_name)`)
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  return (data ?? []) as DeadlineChangeWithRelations[];
}

/** Set of task IDs that already have an update posted today. */
export async function getTaskIdsUpdatedToday(taskIds: string[]) {
  if (taskIds.length === 0) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_updates")
    .select("task_id")
    .eq("update_date", todayISO())
    .in("task_id", taskIds);
  return new Set((data ?? []).map((r) => r.task_id as string));
}

export interface HistoryFilters {
  from: string;
  to: string;
  authorId?: string;
}

export interface HistoryRow extends TaskUpdateWithRelations {
  task: {
    id: string;
    ticket_number: number;
    title: string;
    status: TaskStatus;
    due_date: string;
    task_type: { name: string; color: string };
  };
}

export async function getHistory(filters: HistoryFilters) {
  const supabase = await createClient();
  let q = supabase
    .from("task_updates")
    .select(
      `*,
       author:profiles!task_updates_author_id_fkey(id, full_name),
       stage:task_stages!task_updates_stage_id_fkey(id, name),
       previous_stage:task_stages!task_updates_previous_stage_id_fkey(id, name),
       task:tasks(id, ticket_number, title, status, due_date, task_type:task_types(name, color))`,
    )
    .gte("update_date", filters.from)
    .lte("update_date", filters.to);
  if (filters.authorId) q = q.eq("author_id", filters.authorId);
  const { data } = await q.order("update_date", { ascending: false }).order("created_at", { ascending: false });
  return (data ?? []) as HistoryRow[];
}

export interface MemberStats {
  profile: Profile;
  open: number;
  overdue: number;
  dueToday: number;
  needsUpdate: number;
  completedLast7: number;
  lastUpdateAt: string | null;
}

export async function getTeamOverview() {
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: profiles }, { data: tasks }, { data: updatesToday }, { data: recentDone }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
      supabase.from("tasks").select(TASK_SELECT).in("status", ["open", "on_hold"]),
      supabase.from("task_updates").select("task_id, author_id, created_at").eq("update_date", today),
      supabase
        .from("tasks")
        .select("assignee_id")
        .eq("status", "completed")
        .gte("completed_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

  const activeTasks = (tasks ?? []) as TaskWithRelations[];
  const updatedTaskIds = new Set((updatesToday ?? []).map((u) => u.task_id as string));

  const lastUpdateByAuthor = new Map<string, string>();
  for (const u of updatesToday ?? []) {
    const prev = lastUpdateByAuthor.get(u.author_id as string);
    if (!prev || prev < (u.created_at as string)) lastUpdateByAuthor.set(u.author_id as string, u.created_at as string);
  }

  const completedCount = new Map<string, number>();
  for (const r of recentDone ?? []) {
    const id = r.assignee_id as string;
    completedCount.set(id, (completedCount.get(id) ?? 0) + 1);
  }

  const members: MemberStats[] = ((profiles ?? []) as Profile[]).map((p) => {
    const mine = activeTasks.filter((t) => t.assignee_id === p.id);
    const openOnly = mine.filter((t) => t.status === "open");
    return {
      profile: p,
      open: mine.length,
      overdue: mine.filter((t) => t.due_date < today).length,
      dueToday: mine.filter((t) => t.due_date === today).length,
      needsUpdate: openOnly.filter((t) => !updatedTaskIds.has(t.id)).length,
      completedLast7: completedCount.get(p.id) ?? 0,
      lastUpdateAt: lastUpdateByAuthor.get(p.id) ?? null,
    };
  });

  const missingUpdate = activeTasks.filter((t) => t.status === "open" && !updatedTaskIds.has(t.id));

  return { members, activeTasks, missingUpdate, updatedTaskIds };
}

export async function getRecentActivity(limit = 25) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_updates")
    .select(
      `*,
       author:profiles!task_updates_author_id_fkey(id, full_name),
       stage:task_stages!task_updates_stage_id_fkey(id, name),
       previous_stage:task_stages!task_updates_previous_stage_id_fkey(id, name),
       task:tasks(id, ticket_number, title, status, due_date, task_type:task_types(name, color))`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as HistoryRow[];
}
