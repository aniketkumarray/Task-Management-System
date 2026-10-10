import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const message = typeof sp.message === "string" ? sp.message : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
      <p className="mb-5 text-sm text-gray-500">Use your work email and password.</p>

      {message === "check-email" && (
        <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          Account created. Check your email to confirm it, then sign in.
        </p>
      )}
      {error === "inactive" && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Your account has been deactivated. Contact your manager.
        </p>
      )}
      {error === "no-profile" && (
        <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Your login exists but has no team profile. Make sure <span className="font-mono">supabase/schema.sql</span> has
          been run, then sign up again or contact your manager.
        </p>
      )}

      <LoginForm />

      <p className="mt-5 text-center text-sm text-gray-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
