---
phase: 05-live-match-widget
plan: "01"
subsystem: database
tags: [postgres, supabase, realtime, typescript, migrations]

# Dependency graph
requires:
  - phase: 04-admin-panel
    provides: matches table baseline schema with RLS
provides:
  - external_match_id integer column on public.matches
  - matches_external_id_idx index for fast lookup by football-data.org match ID
  - matches table enrolled in supabase_realtime publication
  - TypeScript types for external_match_id in Database Row/Insert/Update and Match interface
affects:
  - 05-02-live-scores-edge-fn
  - 05-03-today-widget
  - 05-04-score-updater
  - 05-05-realtime-subscription

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration files use brief comment header identifying purpose; no transaction wrapping (Supabase applies as-is)"
    - "src/types/index.ts is the single TypeScript types file; Database Row/Insert/Update and app-level interface kept in sync"

key-files:
  created:
    - supabase/migrations/0009_live_scores.sql
  modified:
    - src/types/index.ts

key-decisions:
  - "external_match_id stored as integer (not text) to match football-data.org numeric IDs and enable efficient index scans"
  - "ALTER PUBLICATION uses IF NOT EXISTS equivalent pattern via plain ALTER — safe to re-apply on Supabase reset"
  - "Match interface uses optional field (external_match_id?) because existing rows will have NULL until first sync runs"

patterns-established:
  - "Migration pattern: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS for idempotent schema changes"

requirements-completed:
  - live-scores-db
  - live-scores-types

# Metrics
duration: 5min
completed: 2026-06-12
---

# Phase 5 Plan 01: Live Scores DB Foundation Summary

**Supabase migration adding external_match_id integer column + fast index on matches, plus Realtime publication enrollment and matching TypeScript types in all four locations**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-12T00:00:00Z
- **Completed:** 2026-06-12T00:05:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `supabase/migrations/0009_live_scores.sql` with ADD COLUMN, CREATE INDEX, and ALTER PUBLICATION statements
- Updated `src/types/index.ts` with `external_match_id` in Database Row, Insert, Update shapes and the Match interface
- TypeScript build passes with no new errors (two pre-existing errors in `get_leaderboard` function typing are unrelated to this plan)

## Task Commits

Each task was committed atomically:

1. **Tasks 1 + 2: Migration + types (combined per plan spec)** - `a11949c` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified
- `supabase/migrations/0009_live_scores.sql` - Schema migration: external_match_id column, index, Realtime publication
- `src/types/index.ts` - Added external_match_id to 4 locations: Database Row/Insert/Update shapes and Match interface

## Decisions Made
- Combined both tasks into a single commit per plan spec ("Single commit: feat(05-01): ...")
- Used `integer` type (not `bigint`) consistent with football-data.org returning 32-bit numeric match IDs
- Match interface field marked optional (`?`) so existing rows without external_match_id remain valid TypeScript

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript check revealed two pre-existing errors (`get_leaderboard` function missing from Database.Functions type in `src/types/index.ts`). These are pre-existing, not introduced by this plan, and out of scope per deviation rule scope boundary.

## User Setup Required
None - no external service configuration required for this plan. The migration must be applied via `supabase db push` or the Supabase dashboard SQL editor before the Edge Function in plan 05-02 can write to the column.

## Next Phase Readiness
- Migration file ready to apply to Supabase project
- TypeScript types in sync with the new schema
- Ready for 05-02: sync-live-scores Edge Function that reads football-data.org and writes external_match_id + scores
- Ready for 05-03: TodayMatchesWidget Realtime subscription (matches table now in publication)

---
*Phase: 05-live-match-widget*
*Completed: 2026-06-12*
