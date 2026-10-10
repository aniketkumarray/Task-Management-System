"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";

export async function updateName(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length < 2) return { ok: false, error: "Enter your name." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
  if (error) return { ok: false, error: error.message };

  await supabase.auth.updateUser({ data: { full_name: fullName } });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current) return { ok: false, error: "Enter your current password." };
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (next !== confirm) return { ok: false, error: "New passwords don't match." };
  if (next === current) return { ok: false, error: "New password must be different from the current one." };

  const supabase = await createClient();

  // Verify the current password before allowing the change.
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: current,
  });
  if (verifyErr) return { ok: false, error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
