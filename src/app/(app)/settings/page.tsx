import { getTaskTypesWithStages } from "@/lib/queries";
import { TaskTypeEditor } from "./task-type-editor";

export default async function TaskTypesSettingsPage() {
  const types = await getTaskTypesWithStages(true);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        TAT is in working days (Mon–Fri) and pre-fills the due date when a task is created. Stages are listed in order,
        one per line. Renaming keeps history; removing a stage detaches tasks from it.
      </p>

      {types.map((t) => (
        <TaskTypeEditor
          key={t.id}
          type={{
            id: t.id,
            name: t.name,
            description: t.description ?? "",
            tat_days: t.tat_days,
            color: t.color,
            is_active: t.is_active,
            stages: t.task_stages.map((s) => s.name),
          }}
        />
      ))}

      <TaskTypeEditor isNew />
    </div>
  );
}
