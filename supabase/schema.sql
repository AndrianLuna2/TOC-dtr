-- ============================================================
-- SPC Internship Tracker — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Students table
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  course        text,
  school        text,
  required_hours int not null default 486,
  status        text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  start_date    date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 2. DTR entries table
create table if not exists public.dtr_entries (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  date          date not null,
  am_in         time,
  am_out        time,
  pm_in         time,
  pm_out        time,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(student_id, date)
);

-- 3. Indexes for common queries
create index if not exists idx_dtr_student_id on public.dtr_entries(student_id);
create index if not exists idx_dtr_date       on public.dtr_entries(date);
create index if not exists idx_students_status on public.students(status);

-- 4. Auto-update updated_at via trigger
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
  before update on public.students
  for each row execute function public.handle_updated_at();

drop trigger if exists set_dtr_updated_at on public.dtr_entries;
create trigger set_dtr_updated_at
  before update on public.dtr_entries
  for each row execute function public.handle_updated_at();

-- 5. Enable Row Level Security (adjust policies to your auth setup)
alter table public.students   enable row level security;
alter table public.dtr_entries enable row level security;

-- Allow all operations for now (tighten when you add auth)
create policy "Allow all on students"    on public.students    for all using (true) with check (true);
create policy "Allow all on dtr_entries" on public.dtr_entries for all using (true) with check (true);

-- ============================================================
-- Done! You should now see both tables in Table Editor.
-- ============================================================
