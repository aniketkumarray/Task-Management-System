"use client";

import { useState, useTransition } from "react";
import { setMemberActive, setMemberRole } from "@/app/actions/team";
import type { Role } from "@/lib/types";

export function MemberRow({ id, role, isActive, isSelf }: { id: string; role: Role; isActive: boolean; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <td className="px-3 py-2">
        <select
          value={role}
          disabled={pending || isSelf}
          onChange={(e) =>
            startTransition(async () => {
              const res = await setMemberRole(id, e.target.value as Role);
              setError(res.ok ? null : res.error);
            })
          }
          className="input w-auto py-1 text-xs"
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <button
          disabled={pending || isSelf}
          onClick={() =>
            startTransition(async () => {
              const res = await setMemberActive(id, !isActive);
              setError(res.ok ? null : res.error);
            })
          }
          className="btn-ghost btn-sm"
        >
          {isActive ? "Active · Deactivate" : "Inactive · Activate"}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </td>
    </>
  );
}
