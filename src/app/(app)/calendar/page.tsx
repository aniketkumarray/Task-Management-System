import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { requireProfile } from "@/lib/auth";
import { getProfiles, getTasksInRange } from "@/lib/queries";
import { todayISO } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { CalendarToolbar } from "./calendar-toolbar";
import { MonthView } from "./month-view";
import { TimelineView } from "./timeline-view";

const TIMELINE_WEEKS = 6;
const iso = (d: Date) => format(d, "yyyy-MM-dd");

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const profile = await requireProfile();
  const sp = await props.searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const view = pick("view") === "timeline" ? "timeline" : "month";
  const assignee = pick("assignee");
  const today = todayISO();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(pick("date")) ? parseISO(pick("date")) : parseISO(today);

  let from: Date, to: Date, prev: string, next: string, title: string;
  if (view === "month") {
    const ms = startOfMonth(anchor);
    from = startOfWeek(ms, { weekStartsOn: 1 });
    to = endOfWeek(endOfMonth(ms), { weekStartsOn: 1 });
    prev = iso(addMonths(ms, -1));
    next = iso(addMonths(ms, 1));
    title = format(ms, "MMMM yyyy");
  } else {
    // Window starts on the Monday of the week before the anchor, so "today" sits near the left.
    from = startOfWeek(subDays(anchor, 7), { weekStartsOn: 1 });
    to = addDays(addWeeks(from, TIMELINE_WEEKS), -1);
    prev = iso(addWeeks(anchor, -2));
    next = iso(addWeeks(anchor, 2));
    title = `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;
  }

  const [tasks, people] = await Promise.all([
    getTasksInRange(iso(from), iso(to), assignee || undefined),
    getProfiles(),
  ]);
  const days = eachDayOfInterval({ start: from, end: to }).map(iso);

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={view === "month" ? "Tasks shown on their due date." : "Start → due date for every task. Diamonds mark the original deadline when it was moved."}
      />

      <CalendarToolbar
        view={view}
        title={title}
        prevDate={prev}
        nextDate={next}
        todayDate={view === "month" ? today : today}
        assignee={assignee}
        people={people.map((p) => ({ id: p.id, name: p.full_name }))}
        me={profile.id}
      />

      {view === "month" ? (
        <MonthView days={days} month={format(startOfMonth(anchor), "yyyy-MM")} tasks={tasks} today={today} />
      ) : (
        <TimelineView days={days} tasks={tasks} today={today} />
      )}
    </>
  );
}
