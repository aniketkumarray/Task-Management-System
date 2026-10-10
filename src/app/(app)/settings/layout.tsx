import { requireManager } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireManager();
  return (
    <>
      <PageHeader title="Configuration" subtitle="Task types, TAT, stages and team members." />
      <SettingsTabs />
      {children}
    </>
  );
}
