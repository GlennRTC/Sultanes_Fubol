-- Migration: 0011_lock_prediction_by_datetime
-- Purpose: place_prediction currently only checks matches.status = 'scheduled', which
-- depends on the sync-live-scores cron (every 2 min) or an admin manually flipping the
-- match to 'finished'. If that cron lags or fails, predictions stay open during and
-- almost until the end of the match. Fix: also gate on match_datetime, which is a fixed
-- column nobody else mutates -- authoritative regardless of cron timing.

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
  v_user_id        uuid        := auth.uid();
  v_status         text;
  v_match_datetime timestamptz;
  v_user_tokens    integer;
begin
  -- Validate match exists, is still scheduled, AND hasn't kicked off yet (QUI-02 backend
  -- gate). The datetime check is authoritative: status can lag behind kickoff time if the
  -- live-score cron hasn't run yet.
  select status, match_datetime into v_status, v_match_datetime
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'match_not_found';
  end if;

  if v_status <> 'scheduled' or v_match_datetime <= now() then
    raise exception 'match_not_scheduled';
  end if;

  -- Validate user has enough tokens (T-02-NEG: pre-check before deduction)
  select tokens into v_user_tokens
  from public.profiles
  where id = v_user_id;

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
