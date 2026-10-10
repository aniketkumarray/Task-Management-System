// Seeds temporary demo data (users + tasks + updates) for video screenshots.
// Everything it creates is recorded in demo-ids.json so cleanup-demo.mjs can remove it exactly.
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };

const api = async (path, init = {}) => {
  const r = await fetch(`${URL_}${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  const text = await r.text();
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${r.status} ${text}`);
  return text ? JSON.parse(text) : null;
};

const PASSWORD = "Demo12345!";
const TZ = "+05:30";
const ts = (date, time = "17:30") => `${date}T${time}:00${TZ}`;

// The storyline below is written as if today were 2026-10-10; shift every date so it lands on the real today.
const BASE = "2026-10-10";
const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const DELTA = Math.round((Date.parse(todayIST) - Date.parse(BASE)) / 86400000);
const sh = (d) => new Date(Date.parse(d) + DELTA * 86400000).toISOString().slice(0, 10);

// ---- people -----------------------------------------------------------------
const people = [
  { email: "priya.nair@example.com", full_name: "Priya Nair" },
  { email: "rahul.mehta@example.com", full_name: "Rahul Mehta" },
  { email: "sneha.iyer@example.com", full_name: "Sneha Iyer" },
  { email: "arjun.verma@example.com", full_name: "Arjun Verma" },
];
const ids = { users: {}, tasks: {} };
for (const p of people) {
  const u = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: p.full_name, role: "employee" } }),
  });
  ids.users[p.full_name] = u.id;
}
const [manager] = await api("/rest/v1/profiles?select=id,full_name&role=eq.manager&email=eq.aniket.ray@itvedant.com");
const M = manager.id;
const P = ids.users["Priya Nair"], R = ids.users["Rahul Mehta"], S = ids.users["Sneha Iyer"], A = ids.users["Arjun Verma"];

// ---- types / stages ---------------------------------------------------------
const types = await api("/rest/v1/task_types?select=id,name,task_stages(id,name,position)&is_active=eq.true&order=name");
const typeByName = Object.fromEntries(types.map((t) => [t.name, t]));
const dash = typeByName["Dashboard"], rep = typeByName["Report Generation"];
if (!dash || !rep) throw new Error("Expected Dashboard and Report Generation task types");
const stage = (type, pos) => [...type.task_stages].sort((a, b) => a.position - b.position)[pos - 1];
const stageIdAt = (type, pos) => stage(type, pos)?.id ?? null;

// ---- tasks ------------------------------------------------------------------
// updates: [date, time, note, stagePos|null, hours|null]
const tasks = [
  {
    key: "priya_sales",
    title: "Sales Performance Dashboard — Q3 refresh",
    description: "Refresh the Q3 numbers, add region filter and the new target-vs-achieved tile requested by Sales.",
    type: dash, assignee: P, priority: "high", start: "2026-10-05", due: "2026-10-12", stagePos: 3,
    updates: [
      ["2026-10-05", "18:05", "Walked through the Q3 requirements with Sales. Region filter + target tile confirmed.", 1, 2],
      ["2026-10-06", "17:50", "Pulled Q3 closures from CRM; reconciled totals with finance (matched to ₹0.2 L).", 2, 4],
      ["2026-10-07", "18:10", "Built region filter and target-vs-achieved tile. Colour scale pending.", 3, 5],
      ["2026-10-08", "17:40", "Fixed YoY calc for July. Added drill-down to counsellor level.", null, 4.5],
      ["2026-10-09", "18:20", "Shared preview link with Sales head; collecting feedback tomorrow.", null, 3],
    ],
  },
  {
    key: "priya_funnel",
    title: "Weekly Lead Funnel Report",
    description: "Lead → Enquiry → Demo → Admission funnel for the week, by branch.",
    type: rep, assignee: P, priority: "medium", start: "2026-10-08", due: "2026-10-12", stagePos: 2,
    updates: [
      ["2026-10-08", "16:30", "Extracted this week's leads and demos from CRM.", 1, 2],
      ["2026-10-09", "17:55", "Funnel ratios computed; Andheri drop-off at demo stage looks unusually high — checking.", 2, 3],
      ["2026-10-10", "10:40", "Confirmed Andheri demo drop-off is real (schedule clash on Wed). Noted in the report.", null, 1.5],
    ],
  },
  {
    key: "priya_attendance",
    title: "Branch Attendance Dashboard",
    description: "Daily attendance and late-marking trends per branch for HR.",
    type: dash, assignee: P, priority: "medium", start: "2026-09-29", due: "2026-10-06", stagePos: 4,
    moveDue: { to: "2026-10-14", on: "2026-10-07", time: "11:20", reason: "HR changed the source table schema; corrected data re-shared on 7 Oct." },
    updates: [
      ["2026-09-29", "18:00", "Requirement call with HR. Need branch-wise late marks and monthly trend.", 1, 2],
      ["2026-09-30", "17:45", "Attendance export mapped to branch master.", 2, 4],
      ["2026-10-01", "18:15", "Trend and heat-map tiles built.", 3, 5],
      ["2026-10-05", "17:30", "Review with HR — asked for shift-wise split.", 4, 2],
      ["2026-10-07", "11:25", "Source schema changed on HR side; waiting on re-shared data. Deadline moved.", null, 1],
      ["2026-10-09", "18:00", "Re-pointed dashboard to the new table; shift-wise split in place. Final review Monday.", null, 3.5],
    ],
  },
  {
    key: "priya_spend",
    title: "Marketing Spend vs Admissions Report",
    description: "Channel-wise spend against admissions for September.",
    type: rep, assignee: P, priority: "medium", start: "2026-10-06", due: "2026-10-08", stagePos: 4,
    completedAt: ["2026-10-08", "16:10"],
    updates: [
      ["2026-10-06", "17:20", "Spend data from Marketing + admissions from CRM extracted.", 1, 2.5],
      ["2026-10-07", "18:00", "CAC per channel computed; Meta ads CAC up 18% MoM.", 2, 3],
      ["2026-10-08", "16:05", "Reviewed with Marketing head and sent.", 4, 1.5],
    ],
  },
  {
    key: "rahul_trainer",
    title: "Trainer Utilisation Dashboard",
    description: "Hours taught vs available per trainer, by centre.",
    type: dash, assignee: R, priority: "medium", start: "2026-10-06", due: "2026-10-13", stagePos: 2,
    updates: [
      ["2026-10-06", "18:00", "Scoped with Academics; utilisation = taught hours / available hours.", 1, 2],
      ["2026-10-07", "17:50", "Timetable export cleaned; 3 trainers missing centre mapping — raised with ops.", 2, 4],
      ["2026-10-09", "18:05", "Centre mapping fixed. Data model ready for build.", null, 3],
    ],
  },
  {
    key: "rahul_fees",
    title: "Fee Collection Ageing Report",
    description: "Outstanding fees bucketed by 0–30 / 31–60 / 60+ days.",
    type: rep, assignee: R, priority: "high", start: "2026-10-06", due: "2026-10-08", stagePos: 1,
    updates: [
      ["2026-10-06", "17:30", "Requested ledger export from Accounts.", 1, 1],
      ["2026-10-07", "18:10", "Export still pending from Accounts; followed up twice.", null, 0.5],
    ],
  },
  {
    key: "sneha_placement",
    title: "Placement Tracker Dashboard",
    description: "Students placed vs eligible, by course and batch.",
    type: dash, assignee: S, priority: "medium", start: "2026-10-09", due: "2026-10-16", stagePos: 1,
    updates: [["2026-10-09", "17:40", "Kick-off with Placements team. Metrics list agreed.", 1, 2]],
  },
  {
    key: "sneha_enquiry",
    title: "Daily Enquiry Summary Report",
    description: "Yesterday's enquiries by source and branch, auto-shared every morning.",
    type: rep, assignee: S, priority: "low", start: "2026-10-09", due: "2026-10-12", stagePos: 3,
    updates: [
      ["2026-10-09", "16:50", "Query written; source attribution validated against CRM.", 2, 3],
      ["2026-10-10", "09:50", "Draft shared for review with Marketing.", 3, 1],
    ],
  },
  {
    key: "arjun_completion",
    title: "Course Completion Rate Dashboard",
    description: "Completion % by course, batch and trainer, with drop-off points.",
    type: dash, assignee: A, priority: "high", start: "2026-10-01", due: "2026-10-08", stagePos: 3,
    moveDue: { to: "2026-10-13", on: "2026-10-08", time: "15:40", reason: "Academics asked for a batch-level drill-down; adds ~2 days of build." },
    updates: [
      ["2026-10-01", "18:00", "Requirements from Academics captured.", 1, 2],
      ["2026-10-05", "17:30", "LMS completion data prepared; joined to batch master.", 2, 4],
      ["2026-10-07", "18:00", "Core tiles built. Drop-off funnel working.", 3, 5],
      ["2026-10-08", "15:45", "Batch drill-down added to scope — deadline moved to 13 Oct.", null, 3],
      ["2026-10-09", "18:10", "Drill-down half done; performance OK on full data.", null, 4],
    ],
  },
  {
    key: "arjun_mis",
    title: "Monthly MIS Pack — September",
    description: "Standard MIS pack for leadership.",
    type: rep, assignee: A, priority: "high", start: "2026-10-01", due: "2026-10-03", stagePos: 4,
    completedAt: ["2026-10-03", "13:20"],
    updates: [
      ["2026-10-01", "17:50", "All source extracts done.", 1, 3],
      ["2026-10-02", "18:00", "Pack compiled; variance commentary added.", 2, 4],
      ["2026-10-03", "13:15", "Reviewed and sent to leadership.", 4, 1.5],
    ],
  },
];

for (const t of tasks) {
  const [row] = await api("/rest/v1/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: t.title,
      description: t.description,
      task_type_id: t.type.id,
      assignee_id: t.assignee,
      created_by: M,
      current_stage_id: stageIdAt(t.type, t.stagePos),
      status: t.completedAt ? "completed" : "open",
      priority: t.priority,
      start_date: sh(t.start),
      due_date: sh(t.moveDue ? t.moveDue.to : t.due),
      original_due_date: sh(t.due),
      completed_at: t.completedAt ? ts(sh(t.completedAt[0]), t.completedAt[1]) : null,
      created_at: ts(sh(t.start), "10:00"),
    }),
  });
  ids.tasks[t.key] = row.id;

  let prevStage = null;
  for (const [date, time, note, stagePos, hours] of t.updates) {
    const sid = stagePos ? stageIdAt(t.type, stagePos) : null;
    await api("/rest/v1/task_updates", {
      method: "POST",
      body: JSON.stringify({
        task_id: row.id,
        author_id: t.assignee,
        update_date: sh(date),
        note,
        stage_id: sid,
        previous_stage_id: sid && sid !== prevStage ? prevStage : null,
        hours_spent: hours,
        created_at: ts(sh(date), time),
      }),
    });
    if (sid) prevStage = sid;
  }

  if (t.moveDue) {
    await api("/rest/v1/deadline_changes", {
      method: "POST",
      body: JSON.stringify({
        task_id: row.id,
        changed_by: t.assignee,
        old_due_date: sh(t.due),
        new_due_date: sh(t.moveDue.to),
        reason: t.moveDue.reason,
        created_at: ts(sh(t.moveDue.on), t.moveDue.time),
      }),
    });
  }
}

writeFileSync(new URL("./demo-ids.json", import.meta.url), JSON.stringify({ ...ids, password: PASSWORD, delta_days: DELTA, today: todayIST }, null, 2));
console.log(`Created ${Object.keys(ids.users).length} users and ${Object.keys(ids.tasks).length} tasks.`);
