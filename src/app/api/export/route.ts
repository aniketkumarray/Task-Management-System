import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { buildMonthlyWorkbook } from "@/lib/export";
import { todayISO } from "@/lib/dates";

export async function GET(request: Request) {
  const { profile } = await getCurrentProfile();
  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? todayISO().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }

  const { buffer, filename } = await buildMonthlyWorkbook(month, profile.full_name);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
