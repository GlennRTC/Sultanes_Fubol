-- Migration: 0001_profiles
-- Creates the profiles table with username uniqueness, token check, and RLS policies.
-- All token mutations must happen via SQL functions only (CLAUDE.md security constraint).

create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  username    text        not null unique,
  tokens      integer     not null default 0 check (tokens >= 0),
  is_admin    boolean     not null default false,
  is_blocked  boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable Row Level Security (required on every table — CLAUDE.md constraint)
alter table public.profiles enable row level security;

-- RLS Policy: a user can only SELECT their own row (T-01-01: prevents cross-user read)
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- RLS Policy: a user can INSERT their own row only (D-07: frontend INSERT after signUp)
-- T-01-02: prevents writing to another user's row
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- RLS Policy: a user can UPDATE their own row only (T-01-02: prevents cross-user write)
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
