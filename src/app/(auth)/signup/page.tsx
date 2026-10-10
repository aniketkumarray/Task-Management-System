import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Create account</h1>
      <p className="mb-5 text-sm text-gray-500">
        The first person to sign up becomes the manager. Everyone after joins as an employee.
      </p>
      <SignupForm />
      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
