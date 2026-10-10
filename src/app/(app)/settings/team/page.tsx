import { requireManager } from "@/lib/auth";
import { getProfiles } from "@/lib/queries";
import { Avatar } from "@/components/ui";
import { MemberRow } from "./member-row";
import { AddMemberForm } from "./add-member-form";

export default async function TeamSettingsPage() {
  const me = await requireManager();
  const people = await getProfiles(false);
  const canCreate = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Member</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {people.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "opacity-60"}>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <Avatar name={p.full_name} size="sm" />
                    <span className="font-medium text-gray-900">{p.full_name}</span>
                    {p.id === me.id && <span className="text-xs text-gray-400">(you)</span>}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{p.email}</td>
                <MemberRow id={p.id} role={p.role} isActive={p.is_active} isSelf={p.id === me.id} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Add a member</h2>
        {canCreate ? (
          <>
            <p className="mb-3 text-xs text-gray-500">Creates the login directly — no email confirmation needed.</p>
            <AddMemberForm />
          </>
        ) : (
          <p className="text-xs text-gray-500">
            Ask team members to register at <span className="font-mono">/signup</span>. To create accounts from here,
            set <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> in your environment.
          </p>
        )}
      </div>
    </div>
  );
}
