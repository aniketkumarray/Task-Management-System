"use client";

import { useActionState, useEffect, useRef } from "react";
import { addMember } from "@/app/actions/team";
import { FormError } from "@/components/ui";

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div>
        <label className="label">Full name</label>
        <input name="full_name" required className="input" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" required className="input" />
      </div>
      <div>
        <label className="label">Temporary password</label>
        <input name="password" type="text" minLength={6} required className="input" placeholder="Share this with them" />
      </div>
      <div>
        <label className="label">Role</label>
        <select name="role" defaultValue="employee" className="input">
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      <FormError state={state} />
      {state?.ok && <p className="text-xs text-green-700">Member added.</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Adding…" : "Add member"}
      </button>
    </form>
  );
}
