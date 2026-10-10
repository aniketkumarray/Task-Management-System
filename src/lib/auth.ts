import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<{ profile: Profile | null; hasSession: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { profile: null, hasSession: false };

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { profile: (data as Profile | null) ?? null, hasSession: true };
}

export async function requireProfile(): Promise<Profile> {
  const { profile, hasSession } = await getCurrentProfile();
  if (!hasSession) redirect("/login");
  if (!profile) redirect("/auth/signout?reason=no-profile");
  if (!profile.is_active) redirect("/auth/signout?reason=inactive");
  return profile;
}

export async function requireManager(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "manager") redirect("/today");
  return profile;
}
