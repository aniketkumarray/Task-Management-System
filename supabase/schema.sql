-- =============================================================================
-- DA Task Tracker — Supabase schema
-- Run this whole file in the Supabase SQL editor (Database → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null default 'employee' check (role in ('employee', 'manager')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- First user to sign up becomes the manager; everyone after is an employee
-- unless the signup metadata says otherwise (used by "Add member" in the app).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_user boolean;
  requested_role text;
begin
  select not exists (select 1 from public.profiles) into first_user;
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'employee');

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when first_user then 'manager' else requested_role end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS policies. SECURITY DEFINER avoids recursive policy checks.
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager' and is_active
  );
$$;

-- -----------------------------------------------------------------------------
-- Configuration: task types + their stages
-- -----------------------------------------------------------------------------
create table if not exists public.task_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  tat_days    integer not null default 3 check (tat_days >= 0),  -- working days
  color       text not null default '#2563eb',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.task_stages (
  id            uuid primary key default gen_random_uuid(),
  task_type_id  uuid not null references public.task_types (id) on delete cascade,
  name          text not null,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (task_type_id, name)
);

create index if not exists task_stages_type_idx on public.task_stages (task_type_id, position);

-- -----------------------------------------------------------------------------
-- Tasks (the "ticket")
-- -----------------------------------------------------------------------------
create table if not exists public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  ticket_number      integer generated always as identity,
  title              text not null,
  description        text,
  task_type_id       uuid not null references public.task_types (id),
  assignee_id        uuid not null references public.profiles (id),
  created_by         uuid not null references public.profiles (id),
  current_stage_id   uuid references public.task_stages (id),
  status             text not null default 'open'
                     check (status in ('open', 'on_hold', 'completed', 'cancelled')),
  priority           text not null default 'medium'
                     check (priority in ('low', 'medium', 'high')),
  start_date         date not null default current_date,
  due_date           date not null,
  original_due_date  date not null,
  completed_at       timestamptz,
  last_update_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists tasks_assignee_idx on public.tasks (assignee_id, status);
create index if not exists tasks_due_idx on public.tasks (due_date);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Daily updates posted on a task
-- -----------------------------------------------------------------------------
create table if not exists public.task_updates (
  id                 uuid primary key default gen_random_uuid(),
  task_id            uuid not null references public.tasks (id) on delete cascade,
  author_id          uuid not null references public.profiles (id),
  update_date        date not null default current_date,
  note               text not null,
  stage_id           uuid references public.task_stages (id),
  previous_stage_id  uuid references public.task_stages (id),
  hours_spent        numeric(5,2),
  created_at         timestamptz not null default now()
);

create index if not exists task_updates_task_idx on public.task_updates (task_id, created_at desc);
create index if not exists task_updates_author_date_idx on public.task_updates (author_id, update_date desc);

-- Keep tasks.last_update_at in sync
create or replace function public.bump_task_last_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.tasks set last_update_at = new.created_at where id = new.task_id;
  return new;
end;
$$;

drop trigger if exists task_updates_bump on public.task_updates;
create trigger task_updates_bump
  after insert on public.task_updates
  for each row execute function public.bump_task_last_update();

-- -----------------------------------------------------------------------------
-- Deadline changes (always with a reason)
-- -----------------------------------------------------------------------------
create table if not exists public.deadline_changes (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks (id) on delete cascade,
  changed_by    uuid not null references public.profiles (id),
  old_due_date  date not null,
  new_due_date  date not null,
  reason        text not null,
  created_at    timestamptz not null default now()
);

create index if not exists deadline_changes_task_idx on public.deadline_changes (task_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.task_types       enable row level security;
alter table public.task_stages      enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_updates     enable row level security;
alter table public.deadline_changes enable row level security;

-- profiles
drop policy if exists "profiles: read all" on public.profiles;
create policy "profiles: read all" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles: manager update" on public.profiles;
create policy "profiles: manager update" on public.profiles
  for update to authenticated using (public.is_manager()) with check (public.is_manager());

-- task_types / task_stages: everyone reads, managers write
drop policy if exists "task_types: read" on public.task_types;
create policy "task_types: read" on public.task_types for select to authenticated using (true);
drop policy if exists "task_types: manager write" on public.task_types;
create policy "task_types: manager write" on public.task_types
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

drop policy if exists "task_stages: read" on public.task_stages;
create policy "task_stages: read" on public.task_stages for select to authenticated using (true);
drop policy if exists "task_stages: manager write" on public.task_stages;
create policy "task_stages: manager write" on public.task_stages
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- tasks: whole team can see; assignee/creator/manager can change
drop policy if exists "tasks: read" on public.tasks;
create policy "tasks: read" on public.tasks for select to authenticated using (true);

drop policy if exists "tasks: insert" on public.tasks;
create policy "tasks: insert" on public.tasks
  for insert to authenticated
  with check (created_by = auth.uid() and (assignee_id = auth.uid() or public.is_manager()));

drop policy if exists "tasks: update" on public.tasks;
create policy "tasks: update" on public.tasks
  for update to authenticated
  using (assignee_id = auth.uid() or created_by = auth.uid() or public.is_manager())
  with check (assignee_id = auth.uid() or created_by = auth.uid() or public.is_manager());

drop policy if exists "tasks: manager delete" on public.tasks;
create policy "tasks: manager delete" on public.tasks
  for delete to authenticated using (public.is_manager());

-- task_updates
drop policy if exists "task_updates: read" on public.task_updates;
create policy "task_updates: read" on public.task_updates for select to authenticated using (true);

drop policy if exists "task_updates: insert" on public.task_updates;
create policy "task_updates: insert" on public.task_updates
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_manager()
      or exists (select 1 from public.tasks t where t.id = task_id and (t.assignee_id = auth.uid() or t.created_by = auth.uid()))
    )
  );

drop policy if exists "task_updates: delete own" on public.task_updates;
create policy "task_updates: delete own" on public.task_updates
  for delete to authenticated using (author_id = auth.uid() or public.is_manager());

-- deadline_changes
drop policy if exists "deadline_changes: read" on public.deadline_changes;
create policy "deadline_changes: read" on public.deadline_changes for select to authenticated using (true);

drop policy if exists "deadline_changes: insert" on public.deadline_changes;
create policy "deadline_changes: insert" on public.deadline_changes
  for insert to authenticated
  with check (
    changed_by = auth.uid()
    and (
      public.is_manager()
      or exists (select 1 from public.tasks t where t.id = task_id and (t.assignee_id = auth.uid() or t.created_by = auth.uid()))
    )
  );

-- -----------------------------------------------------------------------------
-- Seed: the two DA task types with sensible default stages
-- -----------------------------------------------------------------------------
insert into public.task_types (name, description, tat_days, color)
values
  ('Dashboard', 'Build or enhance a BI dashboard', 5, '#2563eb'),
  ('Report Generation', 'Ad-hoc or scheduled report', 2, '#16a34a')
on conflict (name) do nothing;

insert into public.task_stages (task_type_id, name, position)
select t.id, s.name, s.position
from public.task_types t
join (values
  ('Dashboard', 'Requirement Gathering', 1),
  ('Dashboard', 'Data Preparation', 2),
  ('Dashboard', 'Build', 3),
  ('Dashboard', 'Review', 4),
  ('Dashboard', 'Delivered', 5),
  ('Report Generation', 'Data Extraction', 1),
  ('Report Generation', 'Analysis', 2),
  ('Report Generation', 'Review', 3),
  ('Report Generation', 'Sent', 4)
) as s(type_name, name, position) on s.type_name = t.name
on conflict (task_type_id, name) do nothing;
