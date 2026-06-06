---
phase: 02-calendar-quinielas
plan: 01
subsystem: database
tags: [postgres, supabase, rls, sql-functions, security-definer, typescript, zustand]

# Dependency graph
requires:
  - phase: 01-infrastructure-auth
    provides: profiles table with RLS, Supabase client, authStore, TypeScript Database type

provides:
  - matches table with RLS and UTC datetime storage
  - predictions table with RLS (select-own) and unique(user_id, match_id) constraint
  - leaderboard_points column on profiles
  - leaderboard_view exposing only safe columns (id, username, tokens, leaderboard_points)
  - place_prediction SECURITY DEFINER function (atomic token deduction + prediction insert)
  - calculate_prediction_points SECURITY DEFINER function (D-11 scoring, service-role only)
  - 72 WC2026 group-stage match seed rows (groups A-L, UTC datetimes)
  - Match, Prediction, LeaderboardEntry TypeScript interfaces
  - updateTokens(delta) Zustand action for immediate Navbar balance sync

affects: [02-02, 02-03, 02-04, frontend-calendar, frontend-quinielas, frontend-leaderboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SECURITY DEFINER function pattern with set search_path = public
    - RLS no-write-policy pattern (all mutations via SQL functions only)
    - leaderboard_view for cross-user read without exposing sensitive columns
    - GenericNonUpdatableView requires Relationships field in supabase-js Database type

key-files:
  created:
    - supabase/migrations/0002_matches_predictions.sql
    - supabase/seed/matches_wc2026.sql
  modified:
    - src/types/index.ts
    - src/store/authStore.ts

key-decisions:
  - "leaderboard_view approach for cross-user leaderboard reads instead of broadened profiles RLS — avoids exposing is_admin/is_blocked columns (T-02-ID)"
  - "place_prediction uses auth.uid() internally, never trusts client-passed user_id (T-02-01 spoofing mitigation)"
  - "calculate_prediction_points revoked from authenticated role — service-role only (T-02-EOP elevation of privilege mitigation)"
  - "predictions.unique(user_id, match_id) enforces one-prediction-per-match at DB level (D-12)"
  - "GenericNonUpdatableView in supabase-js requires Relationships field — added to leaderboard_view Database type to prevent TS2353 error"

patterns-established:
  - "SECURITY DEFINER pattern: security definer + set search_path = public + revoke/grant explicit"
  - "No-write-policy RLS: enable RLS but add NO INSERT/UPDATE policies — all writes go through SQL functions"
  - "View-based leaderboard: use a view with explicit column list instead of broadening table RLS"

requirements-completed: [CAL-01, CAL-04, QUI-03, QUI-04, QUI-05]

# Metrics
duration: 8min
completed: 2026-06-06
---

# Phase 02 Plan 01: DB Backend — Matches, Predictions, SQL Functions Summary

**RLS-protected matches + predictions schema with SECURITY DEFINER `place_prediction` / `calculate_prediction_points` functions, 72-match WC2026 UTC seed file, and TypeScript type contracts**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-06T14:34:44Z
- **Completed:** 2026-06-06T14:42:48Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Migration 0002 creates matches + predictions tables with RLS, leaderboard_view, and both SECURITY DEFINER SQL functions — no write policies on either table (all mutations go through SQL functions)
- Full 72-match WC2026 group-stage seed file with Spanish team names and UTC datetimes covering groups A through L
- TypeScript types extended with Match, Prediction, LeaderboardEntry interfaces and matches/predictions/leaderboard_view Database types; authStore updated with updateTokens action

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0002** - `b999366` (feat)
2. **Task 2: 72-match seed file** - `6c71630` (feat)
3. **Task 3: Types + authStore** - `de6b09f` (feat)

## Files Created/Modified

- `supabase/migrations/0002_matches_predictions.sql` - matches table, predictions table, RLS policies, leaderboard_points column on profiles, leaderboard_view, place_prediction function, calculate_prediction_points function
- `supabase/seed/matches_wc2026.sql` - 72 WC2026 group-stage match INSERT rows (groups A-L, UTC times)
- `src/types/index.ts` - added matches/predictions to Database.Tables, leaderboard_view to Database.Views, leaderboard_points to Profile, new Match/Prediction/LeaderboardEntry interfaces
- `src/store/authStore.ts` - added updateTokens(delta) action

## Decisions Made

- **leaderboard_view approach:** Instead of adding a broad `using (true)` RLS policy to profiles (which would expose is_admin/is_blocked), a view with an explicit column list is used. The view exposes only id, username, tokens, leaderboard_points. Resolves RESEARCH pitfall 7.
- **D-11 scoring in calculate_prediction_points:** Exact score = 3 points + 30 tokens; correct outcome (same result sign) = 1 point + 10 tokens; else = 0. Points and tokens updated atomically per prediction row.
- **Service-role-only for calculate_prediction_points:** Revoked from authenticated and anon roles. Only accessible via Supabase service role key (admin dashboard / Phase 4). Prevents T-02-EOP elevation of privilege.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added Relationships field to leaderboard_view Database type**
- **Found during:** Task 3 (tsc --noEmit verification)
- **Issue:** supabase-js `GenericNonUpdatableView` requires a `Relationships` field. Omitting it caused TypeScript to resolve `profiles.Insert` type as `never[]`, breaking RegistroPage.tsx with TS2353 error on `.insert({ id: ... })`
- **Fix:** Added `Relationships: []` to `leaderboard_view` entry in `Database.public.Views`
- **Files modified:** `src/types/index.ts`
- **Verification:** `tsc --noEmit` exits 0 after fix
- **Committed in:** `de6b09f` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for TypeScript compilation. The `Relationships: []` field is mandated by the `GenericNonUpdatableView` contract in supabase-js — missing it creates a type error not in connected files. No scope creep.

## Issues Encountered

- **TypeScript inference bug with supabase-js Views:** When a View entry in `Database.public.Views` is missing its `Relationships` field, supabase-js resolves the `profiles.Insert` type as `never[]`, causing TS2353 errors on unrelated insert calls. Fixed by adding `Relationships: []` to all view definitions. Pattern now documented under `patterns-established`.

## User Setup Required

None — no external service configuration required in this plan. Schema push happens in Plan 02.

## Next Phase Readiness

- All DB schema artifacts ready for Plan 02 (supabase db push to remote)
- TypeScript contracts (Match, Prediction, LeaderboardEntry) available for Plans 03 and 04
- updateTokens action available for PredictionModal in Plan 03
- Schema is NOT yet pushed — Plan 02 is a hard dependency before any frontend can query matches or predictions

---
*Phase: 02-calendar-quinielas*
*Completed: 2026-06-06*
