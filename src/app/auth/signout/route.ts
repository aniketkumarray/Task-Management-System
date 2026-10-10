import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Used when a signed-in auth user can't use the app (no profile row, or
// deactivated). Signing out here avoids a redirect loop with the proxy.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const reason = request.nextUrl.searchParams.get("reason");
  const url = new URL("/login", request.url);
  if (reason) url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
