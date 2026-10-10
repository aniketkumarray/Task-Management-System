"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, updateName } from "@/app/actions/profile";
import { MIN_PASSWORD_LENGTH } from "@/lib/utils";
import { FormError } from "@/components/ui";

export function NameForm({ fullName }: { fullName: string }) {
  const [state, action, pending] = useActionState(updateName, null);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1">
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" defaultValue={fullName} required className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Saving…" : "Save name"}
      </button>
      <div className="basis-full">
        <FormError state={state} />
        {state?.ok && <p className="text-xs text-green-700">Name updated.</p>}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="current_password">Current password</label>
        <input id="current_password" name="current_password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="new_password">New password</label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="confirm_password">Confirm new password</label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            className="input"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500">At least {MIN_PASSWORD_LENGTH} characters.</p>
      <FormError state={state} />
      {state?.ok && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password changed.</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
