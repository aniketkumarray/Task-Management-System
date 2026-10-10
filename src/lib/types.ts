export type Role = "employee" | "manager";
export type TaskStatus = "open" | "on_hold" | "completed" | "cancelled";
export type Priority = "low" | "medium" | "high";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface TaskType {
  id: string;
  name: string;
  description: string | null;
  tat_days: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

export interface TaskStage {
  id: string;
  task_type_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface TaskTypeWithStages extends TaskType {
  task_stages: TaskStage[];
}

export interface Task {
  id: string;
  ticket_number: number;
  title: string;
  description: string | null;
  task_type_id: string;
  assignee_id: string;
  created_by: string;
  current_stage_id: string | null;
  status: TaskStatus;
  priority: Priority;
  start_date: string;
  due_date: string;
  original_due_date: string;
  completed_at: string | null;
  last_update_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  task_type: Pick<TaskType, "id" | "name" | "color" | "tat_days">;
  assignee: Pick<Profile, "id" | "full_name" | "email">;
  current_stage: Pick<TaskStage, "id" | "name" | "position"> | null;
}

export interface TaskUpdate {
  id: string;
  task_id: string;
  author_id: string;
  update_date: string;
  note: string;
  stage_id: string | null;
  previous_stage_id: string | null;
  hours_spent: number | null;
  created_at: string;
}

export interface TaskUpdateWithRelations extends TaskUpdate {
  author: Pick<Profile, "id" | "full_name">;
  stage: Pick<TaskStage, "id" | "name"> | null;
  previous_stage: Pick<TaskStage, "id" | "name"> | null;
}

export interface DeadlineChange {
  id: string;
  task_id: string;
  changed_by: string;
  old_due_date: string;
  new_due_date: string;
  reason: string;
  created_at: string;
}

export interface DeadlineChangeWithRelations extends DeadlineChange {
  changed_by_profile: Pick<Profile, "id" | "full_name">;
}

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };
