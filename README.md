# DA Task Tracker

Lightweight task and deadline tracking for the DA team. Built for quick daily updates: each open task
gets a one-line "what I did today" post, a stage move, and (if needed) a deadline change with a reason.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + RLS) · Tailwind v4 · Vercel

## What's in it

| Area | Who | What |
| --- | --- | --- |
| **My Day** `/today` | Everyone | Your open tasks, split into *Needs update today* / *Updated today*. Inline quick-update form on every card (note, stage, hours, deadline change with reason, mark complete). Red badge in the nav = reminder count. |
| **All Tasks** `/tasks` | Everyone | Filterable table (person, type, status, overdue, search). |
| **Ticket** `/tasks/[id]` | Everyone | Full activity timeline: daily updates, stage moves, deadline changes with reasons. Edit details, hold/complete/cancel. |
| **History** `/history` | Everyone (managers see all) | Past work done, grouped by day, filter by date range and person. |
| **Team Overview** `/team` | Manager | Per-person load, overdue, who hasn't posted today, recent activity. |
| **Configuration** `/settings` | Manager | Task types with TAT (working days) and ordered stages; team members and roles. |

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

Optional: set `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role) to let managers create
member logins directly from the app without the signup page. Keep it server-side only.

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
src/app/(app)/               authenticated pages
src/app/(auth)/              login / signup
```
