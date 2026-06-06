-- Migration: 0003_phase02_fixes
-- Fixes for phase 02 code review findings:
--   CR-01: leaderboard_view must bypass RLS to show all users
--   CR-02: place_prediction TOCTOU race — lock profile row before token check

-- ============================================================
-- CR-01: Recreate leaderboard_view with security_invoker = false
-- so RLS on public.profiles is bypassed and all users are visible.
-- Without this, the SECURITY INVOKER default causes the view to
-- apply the profiles_select_own policy (auth.uid() = id), returning
-- only the querying user's own row from the leaderboard.
-- ============================================================

create or replace view public.leaderboard_view
  with (security_invoker = false)
as
  select id, username, tokens, leaderboard_points
  from public.profiles
  order by leaderboard_points desc, tokens desc;

revoke all on public.leaderboard_view from public, anon;
grant select on public.leaderboard_view to authenticated;

-- ============================================================
-- CR-02: Recreate place_prediction with FOR UPDATE lock on the
-- token read. Without this, concurrent calls can both pass the
-- v_user_tokens < 20 check when the user has exactly 20 tokens,
-- then both fire the UPDATE, driving tokens to -20 and triggering
-- a CHECK constraint violation (code 23514) instead of the mapped
-- 'insufficient_tokens' exception.
-- ============================================================

create or replace function public.place_prediction(
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
  v_user_id      uuid;
  v_match_status text;
  v_user_tokens  integer;
begin
  v_user_id := auth.uid();

  -- Validate match exists and is still scheduled (QUI-02 backend gate)
  select status into v_match_status
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'match_not_found';
  end if;

  if v_match_status <> 'scheduled' then
    raise exception 'match_not_scheduled';
  end if;

  -- Lock the profile row to serialize concurrent token checks (CR-02)
  select tokens into v_user_tokens
  from public.profiles
  where id = v_user_id
  for update;

  if v_user_tokens < 20 then
    raise exception 'insufficient_tokens';
  end if;

  -- Atomically deduct tokens and insert prediction
  update public.profiles
  set tokens = tokens - 20
  where id = v_user_id;

  insert into public.predictions (
    user_id,
    match_id,
    home_score_prediction,
    away_score_prediction,
    tokens_wagered
  ) values (
    v_user_id,
    p_match_id,
    p_home_score,
    p_away_score,
    20
  );
end;
$$;

-- Restrict execution: authenticated users only (T-02-TAM)
revoke execute on function public.place_prediction(uuid, integer, integer) from public, anon;
grant execute on function public.place_prediction(uuid, integer, integer) to authenticated;
