import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: openTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("assignee_id", profile.id)
    .eq("status", "open");
  const ids = (openTasks ?? []).map((t) => t.id as string);

  let pending = 0;
  if (ids.length > 0) {
    const { data: updated } = await supabase
      .from("task_updates")
      .select("task_id")
      .eq("update_date", todayISO())
      .in("task_id", ids);
    const updatedIds = new Set((updated ?? []).map((u) => u.task_id as string));
    pending = ids.filter((id) => !updatedIds.has(id)).length;
  }

  return (
    <AppShell profile={profile} pendingCount={pending}>
      {children}
    </AppShell>
  );
}
