"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { resetMemberPassword, setMemberActive, setMemberRole } from "@/app/actions/team";
import { MIN_PASSWORD_LENGTH } from "@/lib/utils";
import type { Role } from "@/lib/types";

export function MemberRow({
  id,
  role,
  isActive,
  isSelf,
  canResetPassword,
}: {
  id: string;
  role: Role;
  isActive: boolean;
  isSelf: boolean;
  canResetPassword: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);

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
      <td className="px-3 py-2 whitespace-nowrap">
        <span className={`badge mr-1 ${isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
        {!isSelf && (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await setMemberActive(id, !isActive);
                setError(res.ok ? null : res.error);
              })
            }
            className="btn-ghost btn-sm"
          >
            {isActive ? "Deactivate" : "Activate"}
          </button>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {canResetPassword && !isSelf && (
          resetOpen ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await resetMemberPassword(id, newPassword);
                  if (res.ok) {
                    setResetDone(true);
                    setResetOpen(false);
                    setNewPassword("");
                    setError(null);
                    setTimeout(() => setResetDone(false), 4000);
                  } else {
                    setError(res.error);
                  }
                });
              }}
            >
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`New password (${MIN_PASSWORD_LENGTH}+)`}
                minLength={MIN_PASSWORD_LENGTH}
                required
                autoFocus
                className="input w-40 py-1 text-xs"
              />
              <button type="submit" disabled={pending} className="btn-primary btn-sm">
                Set
              </button>
              <button type="button" onClick={() => setResetOpen(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
            </form>
          ) : (
            <button onClick={() => setResetOpen(true)} disabled={pending} className="btn-ghost btn-sm" title="Set a temporary password">
              <KeyRound size={13} /> {resetDone ? "Password set ✓" : "Reset password"}
            </button>
          )
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </>
  );
}
