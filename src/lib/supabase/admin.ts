import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. Server-only. Used for admin operations such as
// creating team members without them having to sign up themselves.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
