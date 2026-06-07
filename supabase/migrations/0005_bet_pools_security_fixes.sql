-- Migration: 0005_bet_pools_security_fixes
-- Applies security and correctness fixes to the Phase 3 bet-pools feature.
-- Run this against live Supabase after 0004_bet_pools.sql is already applied.
--
-- Fixes applied:
--   CR-01: resolve_pool idempotency guard (prevents double-payout on re-run)
--   CR-02: resolve_pool validates winning_option_id belongs to pool before writes
--          + FK constraint on bet_pools.winning_option_id
--   WR-04: place_bet null-check on auth.uid()

-- ============================================================
-- 1. FK constraint on bet_pools.winning_option_id (CR-02 database-level guard)
--    Prevents any write that sets winning_option_id to a UUID not in pool_options.
--    Added after-the-fact: existing rows with winning_option_id = null satisfy
--    the constraint (FK constraints permit null values).
-- ============================================================

alter table public.bet_pools
  add constraint bet_pools_winning_option_id_fkey
  foreign key (winning_option_id) references public.pool_options(id);

-- ============================================================
-- 2. place_bet with WR-04 fix (null auth.uid() guard)
--    Replaces the existing function. All other logic unchanged.
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
  -- 0. Guard: auth.uid() can return null in direct SQL Editor invocations or on
  --    expired JWT edge cases — fail immediately rather than silently operating on
  --    a null user_id (WR-04 defense-in-depth; primary mitigation is REVOKE from anon).
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

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

-- Re-apply grants (CREATE OR REPLACE preserves grants, but be explicit)
revoke execute on function public.place_bet(uuid, uuid, integer) from public, anon;
grant execute on function public.place_bet(uuid, uuid, integer) to authenticated;

-- ============================================================
-- 3. resolve_pool with CR-01 + CR-02 fixes
--    Replaces the existing function. All other logic unchanged.
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
  v_pool_total      integer;
  v_winning_total   integer;
  v_bet             record;
  v_payout          integer;
  v_current_status  text;
begin
  -- 0. Validate pool exists and is not already resolved (CR-01 idempotency guard).
  --    Without this check, a second call re-runs the payout loop in full,
  --    permanently inflating every winner's token balance.
  select status into v_current_status
  from public.bet_pools
  where id = p_pool_id;

  if not found then
    raise exception 'pool_not_found';
  end if;

  if v_current_status = 'resolved' then
    raise exception 'pool_already_resolved';
  end if;

  -- 1. Validate winning_option_id belongs to this pool before any writes (CR-02).
  --    Without this check, an admin typo can permanently corrupt the pool row:
  --    winning_option_id gets set to a wrong UUID, v_winning_total becomes 0,
  --    the early-return fires, and all wagered tokens are silently destroyed.
  if not exists (
    select 1 from public.pool_options
    where id = p_winning_option_id and pool_id = p_pool_id
  ) then
    raise exception 'option_not_in_pool';
  end if;

  -- 2. Sum all tokens wagered in the pool
  select coalesce(sum(tokens_wagered), 0)
  into v_pool_total
  from public.bets
  where pool_id = p_pool_id;

  -- 3. Sum tokens wagered on the winning option
  select coalesce(sum(tokens_wagered), 0)
  into v_winning_total
  from public.bets
  where pool_id = p_pool_id and option_id = p_winning_option_id;

  -- 4. Mark pool as resolved with winning option
  update public.bet_pools
  set status            = 'resolved',
      winning_option_id = p_winning_option_id
  where id = p_pool_id;

  -- 5. Guard: no payouts when zero bets on winning option (Pitfall 6).
  --    Losing tokens remain in economy. Admin should not select an option
  --    with no bets — Phase 4 admin UI will surface this.
  if v_winning_total = 0 then
    return;
  end if;

  -- 6. Distribute tokens proportionally to winning bettors
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
revoke execute on function public.resolve_pool(uuid, uuid) from public, anon, authenticated;
