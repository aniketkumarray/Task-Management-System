import {
  addDays,
  differenceInCalendarDays,
  format,
  isWeekend,
  parseISO,
} from "date-fns";

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Kolkata";

/** Today's date as YYYY-MM-DD in the team's timezone (not the server's). */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isWorkingDayToday(): boolean {
  return !isWeekend(parseISO(todayISO()));
}

/** Adds N working days (Mon–Fri) to a YYYY-MM-DD date. */
export function addBusinessDays(dateISO: string, days: number): string {
  let date = parseISO(dateISO);
  let remaining = days;
  while (remaining > 0) {
    date = addDays(date, 1);
    if (!isWeekend(date)) remaining -= 1;
  }
  return format(date, "yyyy-MM-dd");
}

export function daysUntil(dateISO: string): number {
  return differenceInCalendarDays(parseISO(dateISO), parseISO(todayISO()));
}

export function formatDate(dateISO: string | null | undefined): string {
  if (!dateISO) return "—";
  return format(parseISO(dateISO), "d MMM yyyy");
}

export function formatDateShort(dateISO: string | null | undefined): string {
  if (!dateISO) return "—";
  return format(parseISO(dateISO), "d MMM");
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** YYYY-MM-DD of a timestamp, in the team's timezone. */
export function toDateISO(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function dueLabel(dateISO: string): { text: string; tone: "overdue" | "today" | "soon" | "ok" } {
  const d = daysUntil(dateISO);
  if (d < 0) return { text: `${-d}d overdue`, tone: "overdue" };
  if (d === 0) return { text: "Due today", tone: "today" };
  if (d <= 2) return { text: `Due in ${d}d`, tone: "soon" };
  return { text: `Due ${formatDateShort(dateISO)}`, tone: "ok" };
}
