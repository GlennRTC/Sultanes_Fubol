-- Migration: 0004_bet_pools
-- Creates bet_pools, pool_options, bets, and token_transactions tables,
-- RLS policies, place_bet and resolve_pool SECURITY DEFINER functions,
-- pool_option_totals view, and Realtime publication registration.
-- All token mutations happen in SECURITY DEFINER functions (CLAUDE.md constraint).

-- ============================================================
-- 1. bet_pools table (D-07: binary and multiple_exclusive types only)
-- ============================================================

create table public.bet_pools (
  id                uuid        primary key default gen_random_uuid(),
  question          text        not null,
  type              text        not null check (type in ('binary', 'multiple_exclusive')),
  status            text        not null default 'open'
                                check (status in ('open', 'closed', 'resolved')),
  deadline          timestamptz not null,                   -- always UTC (CLAUDE.md constraint)
  winning_option_id uuid,                                   -- null until resolved
  created_at        timestamptz not null default now()
);

-- Performance: apuestas page fetches pools ordered by deadline
create index bet_pools_deadline_idx on public.bet_pools (deadline);

-- Enable Row Level Security (required on every table — CLAUDE.md constraint)
alter table public.bet_pools enable row level security;

-- All authenticated users can read pools (odds are public data — D-04)
create policy "bet_pools_select_authenticated"
  on public.bet_pools for select
  to authenticated
  using (true);

-- No INSERT/UPDATE policies — admin inserts via Supabase dashboard only (D-08)

-- ============================================================
-- 2. pool_options table
-- ============================================================

create table public.pool_options (
  id         uuid        primary key default gen_random_uuid(),
  pool_id    uuid        not null references public.bet_pools(id) on delete cascade,
  label      text        not null,
  position   integer     not null,   -- 1-based display order
  created_at timestamptz not null default now()
);

-- Performance: join when fetching options per pool
create index pool_options_pool_id_idx on public.pool_options (pool_id);

-- Enable Row Level Security (required on every table — CLAUDE.md constraint)
alter table public.pool_options enable row level security;

-- All authenticated users can read options (needed to display pool choices)
create policy "pool_options_select_authenticated"
  on public.pool_options for select
  to authenticated
  using (true);

-- No INSERT/UPDATE policies — admin inserts via Supabase dashboard only (D-08)

-- ============================================================
-- 3. bets table (APU-05, D-03: one bet per pool per user)
-- ============================================================

create table public.bets (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  pool_id        uuid        not null references public.bet_pools(id) on delete cascade,
  option_id      uuid        not null references public.pool_options(id) on delete cascade,
  tokens_wagered integer     not null check (tokens_wagered >= 10),  -- DB-level minimum (D-02)
  tokens_won     integer,               -- null until resolved, set by resolve_pool
  created_at     timestamptz not null default now(),
  -- APU-05: one bet per pool per user (D-03: locked on submit, no updates/cancellations)
  unique (user_id, pool_id)
);

-- Performance: odds aggregation query
create index bets_pool_id_idx on public.bets (pool_id);
-- Performance: user's own bets fetch on page load
create index bets_user_id_idx on public.bets (user_id);

-- Enable Row Level Security (required on every table — CLAUDE.md constraint)
alter table public.bets enable row level security;

-- Permissive SELECT required for Realtime postgres_changes to deliver events.
-- Individual amounts are non-sensitive gamification tokens. Aggregate odds are
-- explicitly public (D-04). This mirrors how live sports betting odds work.
-- See RESEARCH.md Pitfall 2: without this policy, Realtime silently drops events.
create policy "bets_select_authenticated"
  on public.bets for select
  to authenticated
  using (true);

-- No INSERT policy — all writes via place_bet SECURITY DEFINER only

-- CRITICAL: Register bets table in Realtime publication.
-- Without this line, the channel subscription receives no events (Pitfall 1).
-- Verify in Supabase Dashboard → Database → Replication after migration push.
alter publication supabase_realtime add table bets;

-- ============================================================
-- 4. token_transactions table (TOK-02: audit log for all token movements)
-- ============================================================

create table public.token_transactions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  amount       integer     not null,    -- negative = debit, positive = credit
  type         text        not null
               check (type in (
                 'pool_bet',           -- debit when placing a bet
                 'pool_payout',        -- credit when winning a pool
                 'prediction_bet',     -- debit for quiniela (retroactive future insert)
                 'prediction_payout',  -- credit for quiniela scoring (future)
                 'admin_grant'         -- credit from admin token grant
               )),
  reference_id uuid,                    -- pool_id for pool_bet/payout; null for admin grants
  created_at   timestamptz not null default now()
);

-- Enable Row Level Security (required on every table — CLAUDE.md constraint)
alter table public.token_transactions enable row level security;

-- NO SELECT policy in Phase 3 — internal audit log only (D-13).
-- Service role has full access. User-facing ledger deferred to Phase 4.
-- No INSERT policy — all writes via SECURITY DEFINER functions only.

-- ============================================================
-- 5. pool_option_totals view
--    Seeds initial parimutuel odds on page load.
--    Realtime merges incremental INSERTs on top of these initial totals.
-- ============================================================

create view public.pool_option_totals as
  select
    pool_id,
    option_id,
    coalesce(sum(tokens_wagered), 0) as tokens_total
  from public.bets
  group by pool_id, option_id;

-- Grant SELECT to authenticated users (view-level, not table-level grant)
grant select on public.pool_option_totals to authenticated;

-- ============================================================
-- 6. place_bet function (APU-03, APU-04, TOK-02, TOK-03)
--    Atomically validates pool, enforces minimum bet,
--    locks profile row (CR-02 TOCTOU pattern), deducts tokens,
--    inserts bet, and records audit transaction.
--    SECURITY DEFINER: uses internal auth.uid(), not a client-passed user_id.
--    Granted to authenticated only — NOT to anon or public.
-- ============================================================

create or replace function public.place_bet(
  p_pool_id   uuid,
  p_option_id uuid,
  p_amount    integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_pool_status text;
  v_deadline    timestamptz;
  v_user_tokens integer;
begin
  -- 1. Validate pool exists
  select status, deadline
  into v_pool_status, v_deadline
  from public.bet_pools
  where id = p_pool_id;

  if not found then
    raise exception 'pool_not_found';
  end if;

  -- 2. Gate: pool must be open (APU-03)
  if v_pool_status <> 'open' then
    raise exception 'pool_not_open';
  end if;

  -- 3. Gate: must be before deadline even when status is 'open'.
  --    place_bet checks deadline independently so bets are rejected at the
  --    correct time even if admin forgets to close the pool (Research Q3 resolution).
  if now() >= v_deadline then
    raise exception 'pool_deadline_passed';
  end if;

  -- 4. Validate option_id belongs to this pool (spoofed option_id protection — T-03-06)
  if not exists (
    select 1 from public.pool_options
    where id = p_option_id and pool_id = p_pool_id
  ) then
    raise exception 'option_not_found';
  end if;

  -- 5. Minimum bet enforcement at DB level (D-02, T-03-05)
  if p_amount < 10 then
    raise exception 'below_minimum_bet';
  end if;

  -- 6. Lock profile row to serialize concurrent token checks (CR-02 pattern, T-03-02)
  --    Prevents TOCTOU race: two concurrent calls cannot both pass the balance check.
  select tokens into v_user_tokens
  from public.profiles
  where id = v_user_id
  for update;

  -- 7. Balance check (APU-04, T-03-03)
  if v_user_tokens < p_amount then
    raise exception 'insufficient_tokens';
  end if;

  -- 8. Deduct tokens from profile
  update public.profiles
  set tokens = tokens - p_amount
  where id = v_user_id;

  -- 9. Insert bet — UNIQUE constraint on (user_id, pool_id) catches duplicate at DB level (APU-05, T-03-04)
  insert into public.bets (user_id, pool_id, option_id, tokens_wagered)
  values (v_user_id, p_pool_id, p_option_id, p_amount);

  -- 10. Audit record (TOK-02): negative amount = debit
  insert into public.token_transactions (user_id, amount, type, reference_id)
  values (v_user_id, -p_amount, 'pool_bet', p_pool_id);
end;
$$;

-- Restrict execution: authenticated users only (T-03-01 mitigation)
revoke execute on function public.place_bet(uuid, uuid, integer) from public, anon;
grant execute on function public.place_bet(uuid, uuid, integer) to authenticated;

-- ============================================================
-- 7. resolve_pool function (APU-06, TOK-02)
--    Marks pool resolved, distributes parimutuel tokens to winning bettors.
--    FLOOR division per CLAUDE.md (integer-only, no fractions).
--    Rounding loss is at most 1 ficha per winner — acceptable for token economy (D-12, A7).
--    SERVICE-ROLE ONLY — same pattern as calculate_prediction_points (T-03-01 mitigation).
--
--    Admin invocation via Supabase SQL Editor:
--      SELECT resolve_pool('<pool_id>', '<winning_option_id>');
-- ============================================================

create or replace function public.resolve_pool(
  p_pool_id           uuid,
  p_winning_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_total    integer;
  v_winning_total integer;
  v_bet           record;
  v_payout        integer;
begin
  -- 1. Sum all tokens wagered in the pool
  select coalesce(sum(tokens_wagered), 0)
  into v_pool_total
  from public.bets
  where pool_id = p_pool_id;

  -- 2. Sum tokens wagered on the winning option
  select coalesce(sum(tokens_wagered), 0)
  into v_winning_total
  from public.bets
  where pool_id = p_pool_id and option_id = p_winning_option_id;

  -- 3. Mark pool as resolved with winning option
  update public.bet_pools
  set status            = 'resolved',
      winning_option_id = p_winning_option_id
  where id = p_pool_id;

  -- 4. Guard: no payouts when zero bets on winning option (Pitfall 6).
  --    Losing tokens remain in economy. Admin should not select an option
  --    with no bets — Phase 4 admin UI will surface this.
  if v_winning_total = 0 then
    return;
  end if;

  -- 5. Distribute tokens proportionally to winning bettors
  --    Formula: FLOOR(user_wagered / winning_total * pool_total) — integer arithmetic (CLAUDE.md, D-12)
  for v_bet in
    select id, user_id, tokens_wagered
    from public.bets
    where pool_id = p_pool_id and option_id = p_winning_option_id
  loop
    v_payout := floor(v_bet.tokens_wagered::numeric / v_winning_total * v_pool_total)::integer;

    -- Credit tokens to winner's profile
    update public.profiles
    set tokens = tokens + v_payout
    where id = v_bet.user_id;

    -- Record tokens_won on bet row (APU-07: win/loss display in UI)
    update public.bets
    set tokens_won = v_payout
    where id = v_bet.id;

    -- Audit record (TOK-02): positive amount = credit
    insert into public.token_transactions (user_id, amount, type, reference_id)
    values (v_bet.user_id, v_payout, 'pool_payout', p_pool_id);
  end loop;
end;
$$;

-- Service-role only — NOT granted to authenticated or anon (T-03-01: prevents user self-payout)
-- Same pattern as calculate_prediction_points in 0002_matches_predictions.sql.
revoke execute on function public.resolve_pool(uuid, uuid) from public, anon, authenticated;

-- Admin manual invocation pattern for Phase 3 (Phase 4 admin UI will replace this):
-- Step 1: Verify pool status and confirm winning option in Supabase Table Editor
-- Step 2: Open SQL Editor and run:
--   SELECT resolve_pool('<pool_id_uuid>', '<winning_option_id_uuid>');
-- Step 3: Confirm bet_pools.status = 'resolved' and bets.tokens_won populated
