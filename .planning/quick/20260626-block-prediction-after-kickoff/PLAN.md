---
slug: block-prediction-after-kickoff
type: quick
autonomous: true
files_modified:
  - supabase/migrations/0011_lock_prediction_by_datetime.sql
  - src/components/PredictionModal.tsx
---

# Quick Task: Block predictions once a match has kicked off

## Problem

Predictions are currently gated by `matches.status <> 'scheduled'`, both in the
`place_prediction` SECURITY DEFINER RPC (backend, source of truth) and in
`PredictionModal.tsx`'s `isLocked` check (frontend).

`matches.status` only flips from `'scheduled'` to `'live'` when:
1. The `sync-live-scores` Edge Function (cron, every 2 min) sees IN_PLAY/PAUSED from
   football-data.org, or
2. An admin manually records the final result (flips straight to `'finished'`).

If the cron is slow, rate-limited, or simply not configured/running reliably, `status`
never moves off `'scheduled'` until the admin enters the result — which can be right up
to full time. During that whole window, both the RPC and the UI treat the match as
open, so users can submit predictions during and almost until the end of the match.

## Fix

Gate on `match_datetime` (a fixed, trustworthy column nobody else writes to) in addition
to `status`. A match is locked for new predictions once `now() >= match_datetime`,
regardless of whether the live-score cron has caught up yet.

- Backend: `place_prediction` adds a `now() >= v_match_datetime` check, raising the same
  family of error (`match_not_scheduled`) the frontend already maps to a friendly message.
  This is the authoritative fix — the frontend check is just UX, the RPC is what actually
  protects tokens.
- Frontend: `PredictionModal`'s `isLocked` becomes
  `match.status !== 'scheduled' || new Date(match.match_datetime) <= new Date()` so the
  form locks itself immediately at kickoff without waiting for a status refresh.

## Task 1: Backend — lock place_prediction by match_datetime

**Files:** `supabase/migrations/0011_lock_prediction_by_datetime.sql` (new)

Create a new migration that replaces `public.place_prediction` with the same body as
`supabase/migrations/0002_matches_predictions.sql`'s version, plus a datetime guard.
Read `0002_matches_predictions.sql` first to copy the exact existing logic (token
deduction, insert, unique-constraint reliance) — do not change anything except adding
the guard.

```sql
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
  select status, match_datetime into v_status, v_match_datetime
  from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'match_not_found';
  end if;

  if v_status <> 'scheduled' or v_match_datetime <= now() then
    raise exception 'match_not_scheduled';
  end if;

  select tokens into v_user_tokens
  from public.profiles
  where id = v_user_id;

  if v_user_tokens < 20 then
    raise exception 'insufficient_tokens';
  end if;

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

revoke execute on function public.place_prediction(uuid, integer, integer) from public, anon;
grant execute on function public.place_prediction(uuid, integer, integer) to authenticated;
```

Rules:
- Do not touch `calculate_prediction_points` or any other function in `0002_matches_predictions.sql` — only `place_prediction` is being replaced.
- Keep the exact same exception names (`match_not_found`, `match_not_scheduled`, `insufficient_tokens`) — `PredictionModal.tsx`'s error mapping already handles `match_not_scheduled` with "Este partido ya comenzó — no se aceptan predicciones." which is still accurate.
- This migration file only — do NOT attempt to apply it to the live Supabase project (no DB credentials available in this environment). Report the exact SQL the user needs to run in the Supabase SQL Editor.

## Task 2: Frontend — lock the modal at kickoff time, not just on status

**Files:** `src/components/PredictionModal.tsx`

Read the file fully first (already read in this session — `isLocked` is defined at line 35: `const isLocked = match.status !== 'scheduled';`).

Change it to:
```ts
const isLocked = match.status !== 'scheduled' || new Date(match.match_datetime) <= new Date();
```

No other changes to this file — the existing `isLocked` usage (render mode (b) vs (c)) already does the right thing once the boolean itself is correct.

Rules:
- Do not change `handleConfirm`, the error-mapping logic, or any other render branch.
- After the edit, run `./node_modules/.bin/tsc --noEmit` — only pre-existing errors allowed.

## Commit

Single commit: `fix(quick): lock predictions at kickoff time, not just on status update`

## Output

Report the exact SQL migration content for the user to apply manually (same caveat as Phase 7/Phase 5 schema-push steps — this environment has no Supabase DB credentials), and confirm the frontend change + `tsc --noEmit` result.
