"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireManager } from "@/lib/auth";
import type { ActionResult, Role } from "@/lib/types";

export async function setMemberRole(id: string, role: Role): Promise<ActionResult> {
  const me = await requireManager();
  if (id === me.id && role !== "manager") return { ok: false, error: "You can't demote yourself." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setMemberActive(id: string, isActive: boolean): Promise<ActionResult> {
  const me = await requireManager();
  if (id === me.id && !isActive) return { ok: false, error: "You can't deactivate yourself." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addMember(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireManager();

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set, so members can't be created from here. Ask them to sign up at /signup instead.",
    };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = (String(formData.get("role") ?? "employee") as Role) || "employee";

  if (!fullName || !email || !password) return { ok: false, error: "All fields are required." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
