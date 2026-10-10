import ExcelJS from "exceljs";
import { differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isWeekend, parseISO, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT } from "@/lib/queries";
import { toDateISO, todayISO } from "@/lib/dates";
import { ticketLabel } from "@/lib/utils";
import type { DeadlineChangeWithRelations, Task, TaskUpdateWithRelations, TaskWithRelations } from "@/lib/types";

type TaskRef = Pick<Task, "id" | "ticket_number" | "title">;
type ExportUpdate = TaskUpdateWithRelations & { task: TaskRef };
type ExportChange = DeadlineChangeWithRelations & { task: TaskRef };

/**
 * Monthly workbook for managers, designed to be handed to an LLM:
 * self-describing headers, one fact per row, pre-computed metrics, and a suggested prompt.
 */
export async function buildMonthlyWorkbook(month: string, generatedBy: string): Promise<{ buffer: Buffer; filename: string }> {
  const ms = startOfMonth(parseISO(`${month}-01`));
  const me = endOfMonth(ms);
  const from = format(ms, "yyyy-MM-dd");
  const to = format(me, "yyyy-MM-dd");
  const today = todayISO();
  const asOf = to < today ? to : today;
  const workingDays = eachDayOfInterval({ start: ms, end: parseISO(asOf) < ms ? ms : parseISO(asOf) }).filter((d) => !isWeekend(d)).length;

  const supabase = await createClient();
  const [tasksRes, updatesRes, changesRes, peopleRes] = await Promise.all([
    // every task that was "alive" at some point in the month
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .lte("start_date", to)
      .or(`status.in.(open,on_hold),completed_at.gte.${from}T00:00:00,updated_at.gte.${from}T00:00:00`)
      .order("ticket_number"),
    supabase
      .from("task_updates")
      .select("*, author:profiles!task_updates_author_id_fkey(id, full_name), task:tasks(id, ticket_number, title), stage:task_stages!task_updates_stage_id_fkey(id, name), previous_stage:task_stages!task_updates_previous_stage_id_fkey(id, name)")
      .gte("update_date", from)
      .lte("update_date", to)
      .order("created_at"),
    supabase
      .from("deadline_changes")
      .select("*, changed_by_profile:profiles!deadline_changes_changed_by_fkey(id, full_name), task:tasks(id, ticket_number, title)")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at"),
    supabase.from("profiles").select("id, full_name, role, is_active").order("full_name"),
  ]);
  const tasks = (tasksRes.data ?? []) as TaskWithRelations[];
  const updates = (updatesRes.data ?? []) as unknown as ExportUpdate[];
  const changes = (changesRes.data ?? []) as unknown as ExportChange[];
  const people = (peopleRes.data ?? []) as { id: string; full_name: string; role: string; is_active: boolean }[];

  // ---- derived per-task metrics -------------------------------------------
  const updByTask = new Map<string, ExportUpdate[]>();
  for (const u of updates) updByTask.set(u.task_id, [...(updByTask.get(u.task_id) ?? []), u]);
  const chgByTask = new Map<string, ExportChange[]>();
  for (const c of changes) chgByTask.set(c.task_id, [...(chgByTask.get(c.task_id) ?? []), c]);

  const taskRows = tasks.map((t) => {
    const completedOn = t.completed_at ? toDateISO(t.completed_at) : null;
    const refDate = completedOn ?? asOf;
    const daysLate = t.status === "cancelled" ? null : Math.max(0, differenceInCalendarDays(parseISO(refDate), parseISO(t.due_date)));
    const slipFromOriginal = differenceInCalendarDays(parseISO(t.due_date), parseISO(t.original_due_date));
    const tu = updByTask.get(t.id) ?? [];
    const hours = tu.reduce((s, u) => s + (Number(u.hours_spent) || 0), 0);
    const outcome =
      t.status === "completed"
        ? daysLate === 0
          ? "Completed on time"
          : `Completed ${daysLate}d late`
        : t.status === "cancelled"
          ? "Cancelled"
          : t.status === "on_hold"
            ? "On hold"
            : daysLate && daysLate > 0
              ? `Open — overdue by ${daysLate}d`
              : "Open — on track";
    return { t, completedOn, daysLate, slipFromOriginal, hours, updates: tu.length, deadlineChanges: (chgByTask.get(t.id) ?? []).length, outcome };
  });

  // ---- workbook -------------------------------------------------------------
  const wb = new ExcelJS.Workbook();
  wb.creator = "Task Tracker";
  wb.created = new Date();
  const monthLabel = format(ms, "MMMM yyyy");

  const header = (ws: ExcelJS.Worksheet, cols: { header: string; key: string; width?: number }[]) => {
    ws.columns = cols.map((c) => ({ ...c, width: c.width ?? 18 }));
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    row.alignment = { vertical: "middle" };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  };

  // 1. README / prompt --------------------------------------------------------
  {
    const ws = wb.addWorksheet("Read me");
    ws.columns = [{ width: 110 }];
    const lines = [
      [`Task Tracker — monthly export for ${monthLabel}`, true],
      [`Generated ${format(new Date(), "d MMM yyyy, HH:mm")} by ${generatedBy}. Data as of ${format(parseISO(asOf), "d MMM yyyy")} (${workingDays} working days, Mon–Fri).`],
      [""],
      ["WHAT IS IN THIS FILE", true],
      ["Summary — team-level numbers for the month and a per-person table."],
      ["Tasks — one row per task that was open, completed or changed during the month, with outcome, lateness and effort."],
      ["Daily updates — every one-line progress note posted during the month (date, person, task, stage move, hours)."],
      ["Deadline changes — every deadline move during the month with the reason given. Positive 'Shift (days)' = postponed."],
      ["Stages — the workflow stages configured per task type, so stage names in other sheets can be interpreted."],
      [""],
      ["HOW TO READ IT", true],
      ["TAT = agreed turnaround time in working days for that task type. Due date = current deadline; Original due = deadline when the task was created."],
      ["'Days late' is measured at completion (for completed tasks) or at the data-as-of date (for open tasks). 0 = on time."],
      ["'Updates' counts daily notes. Each person is expected to post one note per open task on every working day they worked on it."],
      ["Hours are self-reported and optional, so treat totals as indicative."],
      [""],
      ["SUGGESTED PROMPT (paste together with this file into ChatGPT / Claude / Gemini)", true],
      [
        `You are an operations analyst. Attached is a monthly export from our team's task tracker for ${monthLabel}. ` +
          "Using the 'Read me' sheet to interpret the columns, give me: " +
          "(1) a 5-line executive summary of the month; " +
          "(2) delivery performance — on-time rate, average lateness, and which task types or people are most affected; " +
          "(3) the root causes behind deadline changes, grouped into themes (e.g. source data late, scope added, dependency on another team, underestimation), with counts and examples quoted from the reasons; " +
          "(4) workload balance across people — tasks, hours and update consistency; " +
          "(5) three specific, actionable recommendations for next month. " +
          "Be concrete, cite task numbers, and flag anything that looks like a data-quality issue rather than a real problem.",
      ],
    ] as [string, boolean?][];
    for (const [text, bold] of lines) {
      const r = ws.addRow([text]);
      r.getCell(1).alignment = { wrapText: true, vertical: "top" };
      if (bold) r.font = { bold: true, size: bold && text.startsWith("Task Tracker") ? 14 : 11 };
    }
  }

  // 2. Summary ----------------------------------------------------------------
  {
    const ws = wb.addWorksheet("Summary");
    ws.columns = [{ width: 38 }, { width: 14 }, { width: 44 }, { width: 12 }, { width: 16 }, { width: 13 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 12 }];
    const completed = taskRows.filter((r) => r.completedOn && r.completedOn >= from && r.completedOn <= to);
    const onTime = completed.filter((r) => r.daysLate === 0);
    const created = tasks.filter((t) => toDateISO(t.created_at) >= from && toDateISO(t.created_at) <= to);
    const openEnd = taskRows.filter((r) => r.t.status === "open" || r.t.status === "on_hold");
    const overdueEnd = openEnd.filter((r) => (r.daysLate ?? 0) > 0);
    const postponed = changes.filter((c) => c.new_due_date > c.old_due_date);
    const avgLate = completed.length ? completed.reduce((s, r) => s + (r.daysLate ?? 0), 0) / completed.length : 0;
    const totalHours = updates.reduce((s, u) => s + (Number(u.hours_spent) || 0), 0);

    const add = (label: string, value: string | number, note = "") => ws.addRow([label, value, note]);
    ws.addRow([`Team summary — ${monthLabel}`]).font = { bold: true, size: 13 };
    ws.addRow(["Metric", "Value", "Notes"]).font = { bold: true };
    add("Working days in period", workingDays, `${format(ms, "d MMM")} – ${format(parseISO(asOf), "d MMM yyyy")}`);
    add("Tasks created", created.length);
    add("Tasks completed", completed.length);
    add("Completed on time", onTime.length, completed.length ? `${Math.round((onTime.length / completed.length) * 100)}% on-time rate` : "");
    add("Average days late (completed tasks)", Number(avgLate.toFixed(1)));
    add("Open at period end", openEnd.length, `${overdueEnd.length} of them overdue`);
    add("Deadline changes", changes.length, `${postponed.length} postponements, ${changes.length - postponed.length} pulled earlier`);
    add("Daily updates posted", updates.length);
    add("Hours logged (self-reported)", Number(totalHours.toFixed(1)));
    ws.addRow([]);

    const bold = (r: ExcelJS.Row) => (r.font = { bold: true });
    ws.addRow(["By task type"]).font = { bold: true, size: 12 };
    bold(ws.addRow(["Task type", "TAT (working days)", "Tasks in month", "Completed", "Completed on time", "Avg days late", "Hours logged"]));
    const byType = new Map<string, typeof taskRows>();
    for (const r of taskRows) byType.set(r.t.task_type.name, [...(byType.get(r.t.task_type.name) ?? []), r]);
    for (const [name, rows] of byType) {
      const done = rows.filter((r) => r.completedOn);
      const ot = done.filter((r) => r.daysLate === 0).length;
      const al = done.length ? Number((done.reduce((s, r) => s + (r.daysLate ?? 0), 0) / done.length).toFixed(1)) : "";
      ws.addRow([name, rows[0].t.task_type.tat_days, rows.length, done.length, ot, al, Number(rows.reduce((s, r) => s + r.hours, 0).toFixed(1))]);
    }
    ws.addRow([]);

    ws.addRow(["By person"]).font = { bold: true, size: 12 };
    bold(ws.addRow(["Person", "Role", "Active tasks", "Completed", "Completed on time", "Overdue now", "Deadline moves made", "Updates posted", "Days with an update", "Hours logged"]));
    for (const p of people.filter((p) => p.is_active)) {
      const rows = taskRows.filter((r) => r.t.assignee_id === p.id);
      if (rows.length === 0 && !updates.some((u) => u.author_id === p.id)) continue;
      const done = rows.filter((r) => r.completedOn);
      const ot = done.filter((r) => r.daysLate === 0).length;
      const od = rows.filter((r) => (r.t.status === "open" || r.t.status === "on_hold") && (r.daysLate ?? 0) > 0).length;
      const mine = updates.filter((u) => u.author_id === p.id);
      const days = new Set(mine.map((u) => u.update_date)).size;
      const hrs = Number(mine.reduce((s, u) => s + (Number(u.hours_spent) || 0), 0).toFixed(1));
      const moves = changes.filter((c) => c.changed_by === p.id).length;
      const active = rows.filter((r) => r.t.status === "open" || r.t.status === "on_hold").length;
      ws.addRow([p.full_name, p.role, active, done.length, ot, od, moves, mine.length, days, hrs]);
    }
  }

  // 3. Tasks ------------------------------------------------------------------
  {
    const ws = wb.addWorksheet("Tasks");
    header(ws, [
      { header: "Ticket", key: "ticket", width: 9 },
      { header: "Title", key: "title", width: 44 },
      { header: "Task type", key: "type", width: 18 },
      { header: "Assignee", key: "assignee", width: 18 },
      { header: "Priority", key: "priority", width: 10 },
      { header: "Status", key: "status", width: 11 },
      { header: "Current stage", key: "stage", width: 20 },
      { header: "Start date", key: "start", width: 12 },
      { header: "Original due", key: "odue", width: 12 },
      { header: "Due date", key: "due", width: 12 },
      { header: "Completed on", key: "done", width: 13 },
      { header: "TAT (working days)", key: "tat", width: 12 },
      { header: "Deadline slip from original (days)", key: "slip", width: 14 },
      { header: "Days late", key: "late", width: 10 },
      { header: "Outcome", key: "outcome", width: 24 },
      { header: "Deadline changes", key: "chg", width: 10 },
      { header: "Updates posted", key: "upd", width: 10 },
      { header: "Hours logged", key: "hours", width: 10 },
      { header: "Last update", key: "last", width: 12 },
      { header: "Description", key: "desc", width: 60 },
    ]);
    for (const r of taskRows) {
      ws.addRow({
        ticket: ticketLabel(r.t.ticket_number),
        title: r.t.title,
        type: r.t.task_type.name,
        assignee: r.t.assignee.full_name,
        priority: r.t.priority,
        status: r.t.status.replace("_", " "),
        stage: r.t.current_stage?.name ?? "",
        start: r.t.start_date,
        odue: r.t.original_due_date,
        due: r.t.due_date,
        done: r.completedOn ?? "",
        tat: r.t.task_type.tat_days,
        slip: r.slipFromOriginal,
        late: r.daysLate ?? "",
        outcome: r.outcome,
        chg: r.deadlineChanges,
        upd: r.updates,
        hours: Number(r.hours.toFixed(1)),
        last: r.t.last_update_at ? toDateISO(r.t.last_update_at) : "",
        desc: r.t.description ?? "",
      });
    }
  }

  // 4. Daily updates ----------------------------------------------------------
  {
    const ws = wb.addWorksheet("Daily updates");
    header(ws, [
      { header: "Date", key: "date", width: 12 },
      { header: "Time", key: "time", width: 8 },
      { header: "Person", key: "person", width: 18 },
      { header: "Ticket", key: "ticket", width: 9 },
      { header: "Task", key: "task", width: 40 },
      { header: "Note", key: "note", width: 80 },
      { header: "Stage moved from", key: "from", width: 20 },
      { header: "Stage moved to", key: "to", width: 20 },
      { header: "Hours", key: "hours", width: 8 },
    ]);
    for (const u of updates) {
      ws.addRow({
        date: u.update_date,
        time: new Intl.DateTimeFormat("en-GB", { timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }).format(new Date(u.created_at)),
        person: u.author.full_name,
        ticket: ticketLabel(u.task.ticket_number),
        task: u.task.title,
        note: u.note,
        from: u.previous_stage?.name ?? "",
        to: u.previous_stage ? (u.stage?.name ?? "") : "",
        hours: u.hours_spent != null ? Number(u.hours_spent) : "",
      });
    }
    ws.getColumn("note").alignment = { wrapText: true, vertical: "top" };
  }

  // 5. Deadline changes -------------------------------------------------------
  {
    const ws = wb.addWorksheet("Deadline changes");
    header(ws, [
      { header: "Date", key: "date", width: 12 },
      { header: "Changed by", key: "by", width: 18 },
      { header: "Ticket", key: "ticket", width: 9 },
      { header: "Task", key: "task", width: 40 },
      { header: "Old due date", key: "old", width: 13 },
      { header: "New due date", key: "new", width: 13 },
      { header: "Shift (days)", key: "shift", width: 11 },
      { header: "Reason", key: "reason", width: 80 },
    ]);
    for (const c of changes) {
      ws.addRow({
        date: toDateISO(c.created_at),
        by: c.changed_by_profile.full_name,
        ticket: ticketLabel(c.task.ticket_number),
        task: c.task.title,
        old: c.old_due_date,
        new: c.new_due_date,
        shift: differenceInCalendarDays(parseISO(c.new_due_date), parseISO(c.old_due_date)),
        reason: c.reason,
      });
    }
    ws.getColumn("reason").alignment = { wrapText: true, vertical: "top" };
  }

  // 6. Stages -----------------------------------------------------------------
  {
    const ws = wb.addWorksheet("Stages");
    header(ws, [
      { header: "Task type", key: "type", width: 20 },
      { header: "TAT (working days)", key: "tat", width: 12 },
      { header: "Stage order", key: "pos", width: 10 },
      { header: "Stage", key: "stage", width: 26 },
    ]);
    const { data: types } = await supabase.from("task_types").select("name, tat_days, is_active, task_stages(name, position)").order("name");
    for (const ty of types ?? []) {
      for (const s of [...(ty.task_stages ?? [])].sort((a, b) => a.position - b.position)) {
        ws.addRow({ type: ty.name + (ty.is_active ? "" : " (inactive)"), tat: ty.tat_days, pos: s.position, stage: s.name });
      }
    }
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, filename: `task-tracker-${month}.xlsx` };
}
