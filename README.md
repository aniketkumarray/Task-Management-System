# Task Tracker

Lightweight task and deadline tracking for any team. Built for quick daily updates: each open task
gets a one-line "what I did today" post, a stage move, and (if needed) a deadline change with a reason.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + RLS) · Tailwind v4 · Vercel

## What's in it

| Area | Who | What |
| --- | --- | --- |
| **My Day** `/today` | Everyone | Your open tasks, split into *Needs update today* / *Updated today*. Inline quick-update form on every card (note, stage, hours, deadline change with reason, mark complete). Red badge in the nav = reminder count. |
| **All Tasks** `/tasks` | Everyone | Filterable table (person, type, status, overdue, search). |
| **Ticket** `/tasks/[id]` | Everyone | Full activity timeline: daily updates, stage moves, deadline changes with reasons. Edit details, hold/complete/cancel. |
| **Calendar** `/calendar` | Everyone | **Month** view: tasks on their due dates (agenda list on phones). **Timeline** view: Gantt-style start → due bars grouped by person, overdue tails, and a diamond marking the original deadline whenever it was moved. Filter by person. |
| **History** `/history` | Everyone (managers see all) | Past work done, grouped by day, filter by date range and person. |
| **Team Overview** `/team` | Manager | Per-person load, overdue, who hasn't posted today, recent activity. **Export Excel** for any month (see below). |
| **Configuration** `/settings` | Manager | Task types with TAT (working days) and ordered stages; team members, roles, and temporary-password resets. |
| **My Profile** `/profile` | Everyone | Change your display name and password (requires the current password). Reached by clicking your name in the sidebar. |

Seeded task types: **Dashboard** (TAT 5d: Requirement Gathering → Data Preparation → Build → Review → Delivered)
and **Report Generation** (TAT 2d: Data Extraction → Analysis → Review → Sent). Edit freely in Configuration.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), run it.
   This creates tables, RLS policies, triggers and the seed task types. It is safe to re-run.
3. **Authentication → Providers → Email**: keep Email enabled. For an internal tool you'll probably want to
   turn **off** "Confirm email" so people can log in immediately after signing up.
4. Copy **Project URL** and **anon key** from **Project Settings → API**.

### 2. Local run

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev
```

Open http://localhost:3000/signup. **The first account created becomes the manager.** Everyone after is an
employee (managers can promote people in Configuration → Team members).

### 3. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the environment variables from `.env.example` in **Project → Settings → Environment Variables**.
3. Deploy. No other config is required.

Optional: set `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API Keys → secret key) to let managers create
member logins and reset forgotten passwords directly from the app. Keep it server-side only.

### Supabase settings to check (Authentication section)

| Setting | Where | Recommended |
| --- | --- | --- |
| Confirm email | Sign In / Providers → Email | **Off** for an internal tool, so self-signups can log in immediately. Not needed if managers add members from the app. |
| Secure password change | Sign In / Providers → Email | **Off** (the default). If on, the in-app password change fails with a reauthentication error. |
| Site URL / Redirect URLs | URL Configuration | Your Vercel URL, e.g. `https://tms-xi-one.vercel.app` and `https://tms-xi-one.vercel.app/**`. Only used by email links, but set it anyway. |

No database changes are needed beyond running `supabase/schema.sql` once.

## Using it on a phone (PWA)

The app is installable — it gets its own home-screen icon, opens full-screen without browser chrome, and has a
bottom tab bar sized for thumbs.

- **Android (Chrome):** open the site → tap **⋮** → **Add to Home screen** / **Install app**. Chrome may also show an
  install banner on its own.
- **iPhone (Safari):** open the site → tap the **Share** button → **Add to Home Screen**.

Long-press the installed icon for shortcuts to *My Day*, *New task* and *Calendar*. If the device is offline, a
friendly "You're offline" page is shown instead of a browser error. The service worker never caches app pages, so
data is always live.

Files involved: `src/app/manifest.ts`, `src/app/icon.png`, `src/app/apple-icon.png`, `public/icons/`, `public/sw.js`,
`public/offline.html`. These paths are excluded from the auth proxy in `src/proxy.ts` — keep that in sync if you add more.

## Monthly Excel export (for AI insights)

Managers can download any month as an `.xlsx` from **Team Overview → Export Excel**. The workbook is designed to be
handed to an LLM (ChatGPT, Claude, Gemini) as-is:

| Sheet | Contents |
| --- | --- |
| Read me | What each sheet/column means, data-as-of date, and a **ready-to-paste prompt** asking for on-time rate, slip root causes, workload balance and recommendations. |
| Summary | Team metrics for the month, then real tables **by task type** and **by person** (active, completed, on time, overdue, deadline moves, updates, days with an update, hours). |
| Tasks | One row per task alive in the month: dates, TAT, slip from original deadline, days late, outcome, counts, hours. |
| Daily updates | Every one-line note: date, time, person, ticket, note, stage move, hours. |
| Deadline changes | Every move with old/new date, shift in days and the reason. |
| Stages | Configured stages per task type, so stage names can be interpreted. |

Route: `GET /api/export?month=YYYY-MM` (managers only; code in `src/lib/export.ts`). Nothing is sent to any AI
service by the app itself — the manager chooses where to upload the file.

## How the daily reminder works

There is no email/cron. "Needs update" is computed live: any task with status **open** assigned to you that
has no update posted today (in `NEXT_PUBLIC_APP_TIMEZONE`). It shows as:

- a red count badge on **My Day** in the sidebar (every page),
- a banner at the top of **My Day**,
- a per-person "Needs update" column and a "without an update today" list on the manager's **Team Overview**.

Tasks that are *on hold* don't count.

## Roles & permissions (enforced by RLS)

- **Employee**: sees all team tasks; creates tasks for themselves; updates / changes deadline / completes tasks they are assigned to or created.
- **Manager**: everything above, plus assign to anyone, reassign, delete tasks, configure task types/stages, manage members.

## Project layout

```
supabase/schema.sql          database schema, RLS, seed
src/proxy.ts                 session refresh + auth redirect (Next 16 "proxy", formerly middleware)
src/lib/supabase/            server / browser / admin clients
src/lib/queries.ts           all reads
src/app/actions/             all writes (server actions)
src/components/quick-update  the one form used for every daily update
src/components/app-shell     sidebar (desktop) + bottom tab bar (phone)
src/app/(app)/               authenticated pages
src/app/(app)/calendar/      month + timeline views
src/app/manifest.ts          PWA manifest; icons in public/icons and src/app/*.png
src/app/(auth)/              login / signup
```
