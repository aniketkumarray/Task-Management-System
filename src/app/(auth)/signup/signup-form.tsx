"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { FormError } from "@/components/ui";

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="full_name">Full name</label>
        <input id="full_name" name="full_name" type="text" autoComplete="name" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required className="input" />
      </div>
      <FormError state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
