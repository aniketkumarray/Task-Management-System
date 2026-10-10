"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveTaskType(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireManager();
  const supabase = await createClient();

  const id = str(formData, "id");
  const name = str(formData, "name");
  const description = str(formData, "description") || null;
  const tatDays = Number(str(formData, "tat_days"));
  const color = str(formData, "color") || "#2563eb";
  const stagesRaw = str(formData, "stages");

  if (!name) return { ok: false, error: "Name is required." };
  if (!Number.isInteger(tatDays) || tatDays < 0) return { ok: false, error: "TAT must be a whole number of days." };

  const stageNames = stagesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (stageNames.length === 0) return { ok: false, error: "Add at least one stage (one per line)." };
  if (new Set(stageNames.map((s) => s.toLowerCase())).size !== stageNames.length) {
    return { ok: false, error: "Stage names must be unique." };
  }

  let typeId = id;
  if (typeId) {
    const { error } = await supabase
      .from("task_types")
      .update({ name, description, tat_days: tatDays, color })
      .eq("id", typeId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("task_types")
      .insert({ name, description, tat_days: tatDays, color })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    typeId = data.id;
  }

  // Reconcile stages by name: keep existing rows (so tasks keep their stage
  // references), add new ones, remove the ones no longer listed.
  const { data: existing } = await supabase.from("task_stages").select("id, name").eq("task_type_id", typeId);
  const existingByName = new Map((existing ?? []).map((s) => [s.name.toLowerCase(), s.id as string]));

  for (let i = 0; i < stageNames.length; i++) {
    const nm = stageNames[i]!;
    const existingId = existingByName.get(nm.toLowerCase());
    if (existingId) {
      await supabase.from("task_stages").update({ name: nm, position: i + 1 }).eq("id", existingId);
      existingByName.delete(nm.toLowerCase());
    } else {
      const { error } = await supabase
        .from("task_stages")
        .insert({ task_type_id: typeId, name: nm, position: i + 1 });
      if (error) return { ok: false, error: error.message };
    }
  }

  const toRemove = [...existingByName.values()];
  if (toRemove.length > 0) {
    // Detach tasks pointing at removed stages before deleting them.
    await supabase.from("tasks").update({ current_stage_id: null }).in("current_stage_id", toRemove);
    await supabase.from("task_updates").update({ stage_id: null }).in("stage_id", toRemove);
    await supabase.from("task_updates").update({ previous_stage_id: null }).in("previous_stage_id", toRemove);
    const { error } = await supabase.from("task_stages").delete().in("id", toRemove);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, id: typeId };
}

export async function setTaskTypeActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireManager();
  const supabase = await createClient();
  const { error } = await supabase.from("task_types").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
