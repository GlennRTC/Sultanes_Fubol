-- Migration: 0002_matches_predictions
-- Creates matches and predictions tables, leaderboard_view, RLS policies,
-- place_prediction and calculate_prediction_points SQL functions.
-- All token mutations happen in SECURITY DEFINER functions (CLAUDE.md constraint).

-- ============================================================
-- 1. matches table
-- ============================================================

create table public.matches (
  id              uuid        primary key default gen_random_uuid(),
  home_team       text        not null,
  away_team       text        not null,
  group_name      text        not null,  -- 'A' through 'L'
  match_datetime  timestamptz not null,  -- always UTC
  status          text        not null default 'scheduled'
                              check (status in ('scheduled', 'live', 'finished')),
  home_score      integer,               -- null until finished
  away_score      integer,               -- null until finished
  created_at      timestamptz not null default now()
);

-- Performance: calendar page fetches all matches ordered by datetime
create index matches_datetime_idx on public.matches (match_datetime);
-- Group-tabbed view filters by group_name
create index matches_group_idx on public.matches (group_name);

-- Enable Row Level Security (required on every table — CLAUDE.md constraint)
alter table public.matches enable row level security;

-- All authenticated users can read matches (public fixture data)
create policy "matches_select_authenticated"
  on public.matches for select
  to authenticated
  using (true);

-- No INSERT/UPDATE policies — seed via migration SQL, updates via SECURITY DEFINER functions only

-- ============================================================
-- 2. predictions table
-- ============================================================

create table public.predictions (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  match_id              uuid        not null references public.matches(id) on delete cascade,
  home_score_prediction integer     not null check (home_score_prediction >= 0),
  away_score_prediction integer     not null check (away_score_prediction >= 0),
  tokens_wagered        integer     not null default 20,
  tokens_awarded        integer,               -- null until scored
  points_earned         integer,               -- null until scored
  created_at            timestamptz not null default now(),
  -- One prediction per user per match (D-12: prediction lock)
  unique (user_id, match_id)
);

-- Fetch all predictions for current user (modal badge display)
create index predictions_user_idx on public.predictions (user_id);
-- Scoring function iterates predictions by match
create index predictions_match_idx on public.predictions (match_id);

-- Enable Row Level Security (required on every table — CLAUDE.md constraint)
alter table public.predictions enable row level security;

-- User can read their own predictions only (T-02-IDP: prevents cross-user prediction reads)
create policy "predictions_select_own"
  on public.predictions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT/UPDATE policies — all writes via place_prediction SECURITY DEFINER function only
-- (T-02-TAM: prevents direct INSERT from frontend, enforcing 20-token cost)

-- ============================================================
-- 3. Add leaderboard_points column to profiles
-- ============================================================

alter table public.profiles add column if not exists leaderboard_points integer not null default 0;

-- ============================================================
-- 4. leaderboard_view — exposes ONLY safe columns (T-02-ID mitigation)
-- ============================================================

create view public.leaderboard_view as
  select id, username, tokens, leaderboard_points
  from public.profiles
  order by leaderboard_points desc, tokens desc;

-- Views inherit query role's privileges — grant explicit select
grant select on public.leaderboard_view to authenticated;

-- ============================================================
-- 5. place_prediction function
--    Atomically deducts 20 tokens and inserts a prediction.
--    SECURITY DEFINER: uses internal auth.uid(), not a client-passed user_id (T-02-01).
--    Granted to authenticated only — NOT to anon or public.
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
  v_user_id     uuid    := auth.uid();
  v_status      text;
  v_user_tokens integer;
begin
  -- Validate match exists and is still scheduled (QUI-02 backend gate)
  select status into v_status
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'match_not_found';
  end if;

  if v_status <> 'scheduled' then
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

-- ============================================================
-- 6. calculate_prediction_points function
--    Scores predictions for a finished match per D-11:
--      exact score  → 3 points + 30 tokens
--      correct outcome → 1 point + 10 tokens
--      incorrect → 0 + 0
--    Service-role only — NOT granted to authenticated (T-02-EOP mitigation).
-- ============================================================

create or replace function public.calculate_prediction_points(
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
  v_pred   record;
  v_points integer;
  v_tokens integer;
  v_actual_home_sign integer;
  v_actual_away_sign integer;
  v_pred_home_sign   integer;
  v_pred_away_sign   integer;
begin
  -- Mark match as finished and record final score
  update public.matches
  set status     = 'finished',
      home_score = p_home_score,
      away_score = p_away_score
  where id = p_match_id;

  -- Score each unscored prediction for this match
  for v_pred in
    select id, user_id, home_score_prediction, away_score_prediction
    from public.predictions
    where match_id = p_match_id
      and points_earned is null
  loop
    v_points := 0;
    v_tokens := 0;

    if v_pred.home_score_prediction = p_home_score
       and v_pred.away_score_prediction = p_away_score then
      -- Exact score (D-11)
      v_points := 3;
      v_tokens := 30;
    else
      -- Determine outcome signs: positive = home win, negative = away win, zero = draw
      v_actual_home_sign := sign(p_home_score - p_away_score);
      v_pred_home_sign   := sign(v_pred.home_score_prediction - v_pred.away_score_prediction);

      if v_pred_home_sign = v_actual_home_sign then
        -- Correct outcome (D-11)
        v_points := 1;
        v_tokens := 10;
      end if;
    end if;

    -- Record points and tokens on the prediction row
    update public.predictions
    set points_earned  = v_points,
        tokens_awarded = v_tokens
    where id = v_pred.id;

    -- Update profile only when tokens are awarded (avoids no-op update on 0+0 outcomes)
    if v_tokens > 0 then
      update public.profiles
      set tokens            = tokens + v_tokens,
          leaderboard_points = leaderboard_points + v_points
      where id = v_pred.user_id;
    end if;
  end loop;
end;
$$;

-- Service-role only — no grant to authenticated or anon (T-02-EOP: prevents user self-payout)
revoke execute on function public.calculate_prediction_points(uuid, integer, integer) from public, anon, authenticated;
