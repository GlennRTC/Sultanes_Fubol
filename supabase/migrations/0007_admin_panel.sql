-- Migration: 0007_admin_panel
-- Creates the Phase 4 admin DB layer:
--   1. private schema + private.is_admin() SECURITY DEFINER helper (non-recursive RLS)
--   2. admin_logs table with RLS (SELECT admin-only; NO INSERT policy — all writes via fns)
--   3. New SELECT policies on profiles (admin) and token_transactions (admin)
--   4. Five admin SECURITY DEFINER functions with REVOKE/GRANT:
--      admin_block_user, admin_grant_tokens, admin_set_match_result,
--      create_bet_pool, admin_resolve_pool
--
-- SECURITY: Every admin function: (1) null-check auth.uid(), (2) is_admin guard,
--   (3) business logic, (4) admin_logs INSERT. No exceptions.
-- All RLS policies using is_admin use (select private.is_admin()) for per-statement caching.
-- private schema functions are not exposed by PostgREST (non-public schema).

-- ============================================================
-- SECTION 1: Private schema + private.is_admin() helper
-- ============================================================

create schema if not exists private;

-- SECURITY DEFINER: reads profiles bypassing RLS to avoid infinite recursion.
-- Pitfall 1 (RESEARCH.md): a policy on profiles that queries profiles inline
-- causes infinite recursion — SECURITY DEFINER breaks the recursion loop.
-- STABLE: tells the planner this fn is read-only; enables per-statement initPlan caching.
-- set search_path = public: prevents search-path injection attacks.
-- No GRANT needed — private schema is never exposed via PostgREST.
create or replace function private.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_admin = true
  );
end;
$$;

-- No GRANT needed: private schema functions are not exposed by PostgREST.
-- Called via (select private.is_admin()) in RLS policies for per-statement caching.

-- ============================================================
-- SECTION 2: admin_logs table
-- CRITICAL: Must be created BEFORE the function definitions that INSERT into it.
-- Pitfall 7 (RESEARCH.md): if admin_logs doesn't exist when functions are created,
-- the first admin action rolls back with a confusing error (table not found).
-- ============================================================

create table public.admin_logs (
  id              uuid        primary key default gen_random_uuid(),
  admin_id        uuid        not null references auth.users(id),
  action          text        not null,
  target_user_id  uuid        references auth.users(id),  -- nullable (pool actions have no target user)
  details         jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

-- Required on every table (CLAUDE.md constraint)
alter table public.admin_logs enable row level security;

-- Admin-only SELECT (uses SELECT-wrapped helper for per-statement caching)
-- T-04-05: (select private.is_admin()) triggers Postgres initPlan optimization
-- so the function runs once per statement, not once per row.
create policy "admin_logs_select_admin"
  on public.admin_logs for select
  using ((select private.is_admin()));

-- NO INSERT policy: all inserts happen inside SECURITY DEFINER functions only.
-- T-04-03: prevents a malicious client from spoofing fake audit entries.
-- This mirrors the token_transactions pattern from migration 0004.

-- ============================================================
-- SECTION 3: New RLS policies on existing tables
-- ============================================================

-- Second SELECT policy on profiles: OR-adds admin access.
-- Does NOT replace the existing profiles_select_own policy.
-- Policies are OR'd: a row is visible if ANY policy permits it.
-- CRITICAL: use (select private.is_admin()) not private.is_admin() — the SELECT wrapper
-- triggers Postgres initPlan optimization so the function runs once per statement,
-- not once per row (prevents catastrophic N+1 per-row evaluation on large tables).
-- T-04-04: private.is_admin() is SECURITY DEFINER — reads profiles bypassing RLS,
-- breaking the infinite-recursion loop that would occur with an inline exists() check.
create policy "profiles_select_admin"
  on public.profiles for select
  using ((select private.is_admin()));

-- Admin-only SELECT on token_transactions (needed for AdminReportsPage: token circulation).
-- Previously there was no SELECT policy — only service-role access.
-- Pitfall 5 (RESEARCH.md): SELECT count(*) FROM token_transactions returns 0 rows
-- for non-admins because RLS blocks all reads without this policy.
create policy "token_transactions_select_admin"
  on public.token_transactions for select
  using ((select private.is_admin()));

-- ============================================================
-- SECTION 4: admin_block_user function (ADM-01, ADM-08)
-- Blocks or unblocks a user. p_blocked=true to block, false to unblock.
-- ============================================================

create or replace function public.admin_block_user(
  p_target_user_id uuid,
  p_blocked         boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  -- 1. Null-check: auth.uid() can be null in SQL Editor or on expired JWT (WR-04 pattern)
  if v_admin_id is null then
    raise exception 'not_authenticated';
  end if;

  -- 2. Admin guard (T-04-01: elevation-of-privilege mitigation)
  if not exists (
    select 1 from public.profiles where id = v_admin_id and is_admin = true
  ) then
    raise exception 'not_admin';
  end if;

  -- 3. Validate target user exists
  if not exists (
    select 1 from public.profiles where id = p_target_user_id
  ) then
    raise exception 'user_not_found';
  end if;

  -- 4. Business logic: update is_blocked flag
  update public.profiles
    set is_blocked = p_blocked, updated_at = now()
    where id = p_target_user_id;

  -- 5. Audit log (T-04-08: every admin action is documented)
  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (
    v_admin_id,
    case when p_blocked then 'user_blocked' else 'user_unblocked' end,
    p_target_user_id,
    jsonb_build_object('blocked', p_blocked)
  );
end;
$$;

-- Pitfall 2 (RESEARCH.md): public schema fns are exposed via PostgREST —
-- REVOKE/GRANT controls which roles can call this function.
revoke execute on function public.admin_block_user(uuid, boolean) from public, anon;
grant execute on function public.admin_block_user(uuid, boolean) to authenticated;

-- ============================================================
-- SECTION 5: admin_grant_tokens function (ADM-03, TOK-01, ADM-08)
-- A positive p_amount grants tokens; a negative p_amount removes them.
-- Prevents balance from going below 0 (mirrors CHECK on profiles.tokens).
-- CLAUDE.md constraint: tokens only mutated via SECURITY DEFINER functions.
-- ============================================================

create or replace function public.admin_grant_tokens(
  p_target_user_id uuid,
  p_amount          integer,
  p_note            text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id     uuid    := auth.uid();
  v_current_bal  integer;
begin
  -- 1. Null-check
  if v_admin_id is null then
    raise exception 'not_authenticated';
  end if;

  -- 2. Admin guard (T-04-01)
  if not exists (
    select 1 from public.profiles where id = v_admin_id and is_admin = true
  ) then
    raise exception 'not_admin';
  end if;

  -- 3. Validate amount is non-zero
  if p_amount = 0 then
    raise exception 'amount_cannot_be_zero';
  end if;

  -- 4. Lock target user profile row and read balance (CR-02 TOCTOU pattern)
  select tokens into v_current_bal
    from public.profiles
    where id = p_target_user_id
    for update;

  if not found then
    raise exception 'user_not_found';
  end if;

  -- 5. Guard: result cannot go below 0 (T-04-02: no negative balances)
  if v_current_bal + p_amount < 0 then
    raise exception 'insufficient_tokens';
  end if;

  -- 6. Business logic: update token balance
  update public.profiles
    set tokens = tokens + p_amount, updated_at = now()
    where id = p_target_user_id;

  -- 7. Audit transaction record (TOK-02: all token movements logged)
  insert into public.token_transactions (user_id, amount, type, reference_id)
  values (p_target_user_id, p_amount, 'admin_grant', null);

  -- 8. Admin audit log (T-04-08)
  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (
    v_admin_id,
    case when p_amount > 0 then 'tokens_granted' else 'tokens_removed' end,
    p_target_user_id,
    jsonb_build_object('amount', p_amount, 'note', p_note)
  );
end;
$$;

revoke execute on function public.admin_grant_tokens(uuid, integer, text) from public, anon;
grant execute on function public.admin_grant_tokens(uuid, integer, text) to authenticated;

-- ============================================================
-- SECTION 6: admin_set_match_result function (ADM-04, ADM-08)
-- Delegates to existing calculate_prediction_points which:
--   (a) updates the match row (status, home_score, away_score)
--   (b) scores all predictions and distributes tokens
-- CRITICAL (Pitfall 8 RESEARCH.md): do NOT add a separate UPDATE matches here —
-- calculate_prediction_points already does that UPDATE. Double-write corrupts nothing
-- but wastes a write; more importantly the scoring loop must run AFTER the match update.
-- Running as SECURITY DEFINER owner bypasses the REVOKE from authenticated on the inner fn.
-- ============================================================

create or replace function public.admin_set_match_result(
  p_match_id   uuid,
  p_home_score integer,
  p_away_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  -- 1. Null-check
  if v_admin_id is null then
    raise exception 'not_authenticated';
  end if;

  -- 2. Admin guard (T-04-01)
  if not exists (
    select 1 from public.profiles where id = v_admin_id and is_admin = true
  ) then
    raise exception 'not_admin';
  end if;

  -- 3. Validate scores are non-negative
  if p_home_score < 0 or p_away_score < 0 then
    raise exception 'invalid_score';
  end if;

  -- 4. Validate match exists
  if not exists (
    select 1 from public.matches where id = p_match_id
  ) then
    raise exception 'match_not_found';
  end if;

  -- 5. Delegate to existing calculate_prediction_points which updates the match row
  --    AND distributes points/tokens. Running as SECURITY DEFINER owner bypasses the
  --    REVOKE from authenticated on the inner function (Q1, Q6 — RESEARCH.md).
  --    Approach: SECURITY DEFINER call chain (Assumption A1 — standard PostgreSQL behavior).
  perform public.calculate_prediction_points(p_match_id, p_home_score, p_away_score);

  -- 6. Audit log (T-04-08)
  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (
    v_admin_id,
    'match_result_entered',
    null,
    jsonb_build_object(
      'match_id', p_match_id,
      'home_score', p_home_score,
      'away_score', p_away_score
    )
  );
end;
$$;

revoke execute on function public.admin_set_match_result(uuid, integer, integer) from public, anon;
grant execute on function public.admin_set_match_result(uuid, integer, integer) to authenticated;

-- ============================================================
-- SECTION 7: create_bet_pool function (ADM-05, ADM-08)
-- Atomically inserts pool + options in one transaction.
-- Returns the new pool's UUID for immediate use in the admin UI.
-- No INSERT policy on bet_pools/pool_options needed: SECURITY DEFINER bypasses RLS.
-- ============================================================

create or replace function public.create_bet_pool(
  p_question  text,
  p_type      text,
  p_deadline  timestamptz,
  p_options   text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid    := auth.uid();
  v_pool_id  uuid;
  i          integer;
begin
  -- 1. Null-check
  if v_admin_id is null then
    raise exception 'not_authenticated';
  end if;

  -- 2. Admin guard (T-04-06: elevation-of-privilege mitigation)
  if not exists (
    select 1 from public.profiles where id = v_admin_id and is_admin = true
  ) then
    raise exception 'not_admin';
  end if;

  -- 3. Validate pool type
  if p_type not in ('binary', 'multiple_exclusive') then
    raise exception 'invalid_pool_type';
  end if;

  -- 4. Validate minimum options count
  if array_length(p_options, 1) < 2 then
    raise exception 'pool_needs_at_least_two_options';
  end if;

  -- 5. Validate deadline is in the future
  if p_deadline <= now() then
    raise exception 'deadline_must_be_future';
  end if;

  -- 6. Atomically create pool row
  insert into public.bet_pools (question, type, deadline)
  values (p_question, p_type, p_deadline)
  returning id into v_pool_id;

  -- 7. Create pool options (1-based position matches display order)
  for i in 1..array_length(p_options, 1) loop
    insert into public.pool_options (pool_id, label, position)
    values (v_pool_id, p_options[i], i);
  end loop;

  -- 8. Audit log (T-04-08)
  insert into public.admin_logs (admin_id, action, details)
  values (
    v_admin_id,
    'pool_created',
    jsonb_build_object(
      'pool_id', v_pool_id,
      'question', p_question,
      'type', p_type,
      'deadline', p_deadline
    )
  );

  return v_pool_id;
end;
$$;

revoke execute on function public.create_bet_pool(text, text, timestamptz, text[]) from public, anon;
grant execute on function public.create_bet_pool(text, text, timestamptz, text[]) to authenticated;

-- ============================================================
-- SECTION 8: admin_resolve_pool function (ADM-06, ADM-08)
-- Delegates to existing resolve_pool() function.
-- SECURITY DEFINER call chain: admin_resolve_pool runs as function owner (postgres),
-- which can call resolve_pool even though it is REVOKE'd from authenticated.
-- Approach used: perform public.resolve_pool(...) — Assumption A1 (RESEARCH.md).
-- Fallback: if Supabase raises a permission error on your instance, replace the
-- `perform public.resolve_pool(...)` line with the full resolve logic inlined
-- from migration 0005 SECTION 3, and add a comment noting the fallback was used.
-- T-04-07: admin_resolve_pool validates pool status = 'open' before delegating;
-- the inner resolve_pool also has its own CR-01 idempotency guard.
-- ============================================================

create or replace function public.admin_resolve_pool(
  p_pool_id          uuid,
  p_winning_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  -- 1. Null-check
  if v_admin_id is null then
    raise exception 'not_authenticated';
  end if;

  -- 2. Admin guard (T-04-01)
  if not exists (
    select 1 from public.profiles where id = v_admin_id and is_admin = true
  ) then
    raise exception 'not_admin';
  end if;

  -- 3. Validate pool exists and is open (T-04-07: double-resolve guard at admin layer)
  if not exists (
    select 1 from public.bet_pools where id = p_pool_id and status = 'open'
  ) then
    raise exception 'pool_not_open_or_not_found';
  end if;

  -- 4. Validate winning option belongs to this pool
  if not exists (
    select 1 from public.pool_options
    where id = p_winning_option_id and pool_id = p_pool_id
  ) then
    raise exception 'winning_option_not_found';
  end if;

  -- 5. Delegate to existing resolve_pool function (SECURITY DEFINER owner can call it).
  --    If this raises a permission error on your Supabase instance, replace this line
  --    with the resolve_pool logic inlined from migration 0005 SECTION 3.
  perform public.resolve_pool(p_pool_id, p_winning_option_id);

  -- 6. Audit log (T-04-08)
  insert into public.admin_logs (admin_id, action, details)
  values (
    v_admin_id,
    'pool_resolved',
    jsonb_build_object(
      'pool_id', p_pool_id,
      'winning_option_id', p_winning_option_id
    )
  );
end;
$$;

revoke execute on function public.admin_resolve_pool(uuid, uuid) from public, anon;
grant execute on function public.admin_resolve_pool(uuid, uuid) to authenticated;
