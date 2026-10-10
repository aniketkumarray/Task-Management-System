import { requireProfile } from "@/lib/auth";
import { getProfiles, getTaskTypesWithStages } from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { NewTaskForm } from "./new-task-form";

export default async function NewTaskPage() {
  const profile = await requireProfile();
  const [types, people] = await Promise.all([getTaskTypesWithStages(), getProfiles()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New task" subtitle="Due date is pre-filled from the task type's TAT. You can override it." />
      <div className="card p-5">
        <NewTaskForm
          types={types.map((t) => ({ id: t.id, name: t.name, tat_days: t.tat_days, stages: t.task_stages.map((s) => s.name) }))}
          people={people.map((p) => ({ id: p.id, name: p.full_name }))}
          me={profile.id}
          isManager={profile.role === "manager"}
          today={todayISO()}
        />
      </div>
    </div>
  );
}
