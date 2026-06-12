---
phase: 05-live-match-widget
plan: "03"
subsystem: api
tags: [deno, edge-function, supabase, football-data-org, cron, realtime, live-scores]

# Dependency graph
requires:
  - phase: 05-live-match-widget
    provides: "DB column external_match_id on matches table (migration 0009 from plan 05-01)"

provides:
  - "Deno Edge Function sync-live-scores that fetches WC matches from football-data.org and writes live status/scores to DB"
  - "Two-pass team matching: fast path via external_match_id, slow path via normalized name + date"
  - "Idempotent update logic (only writes when status/score/external_match_id changed)"

affects:
  - 05-04-TodayMatchesWidget
  - 05-05-CalendarIntegration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Function Deno.serve pattern (--no-verify-jwt for cron callers)"
    - "Two-pass external API → DB match resolution (D-05): fast path via stored ID, slow path via normalized names"
    - "Accent-stripping normalization + alias map for multilingual team name reconciliation"
    - "Idempotent DB write guard: compare all fields before issuing UPDATE"

key-files:
  created:
    - supabase/functions/sync-live-scores/index.ts
  modified: []

key-decisions:
  - "No JWT check at all — cron-job.org callers have no user session (D-07)"
  - "Scores set to null while IN_PLAY/PAUSED (free tier does not provide live scores per D-02/D-03)"
  - "unmatchedNames included in response JSON for observability without adding admin_logs overhead"
  - "Accent stripping done both via explicit char replacements AND NFD + combining-char strip for reliability"

patterns-established:
  - "sync-live-scores: normalize() function strips accents then applies alias map — future plans should reuse this pattern for any football-data.org → DB team name reconciliation"

requirements-completed:
  - live-scores-edge-function

# Metrics
duration: 8min
completed: 2026-06-12
---

# Phase 5 Plan 03: sync-live-scores Edge Function Summary

**Deno Edge Function that polls football-data.org v4 every 2 minutes via cron, normalizes team names with a two-pass match strategy, and idempotently writes live status and final scores to the matches table using the service-role key**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-12T22:20:00Z
- **Completed:** 2026-06-12T22:29:09Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `supabase/functions/sync-live-scores/index.ts` — full implementation of the cron → Edge Function → DB step of the live scores pipeline (D-01)
- Implemented two-pass match resolution: fast path using stored `external_match_id`, slow path using normalized team names + date prefix (D-05)
- Idempotent writes: only issues an UPDATE when status, home_score, away_score, or external_match_id actually changed — prevents unnecessary Supabase Realtime broadcasts
- Returns structured JSON summary `{ ok, date, apiMatchCount, updated, skipped, unmatched, unmatchedNames }` for cron monitoring

## Task Commits

1. **Task 1: Create sync-live-scores Edge Function** - `ebea13a` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `supabase/functions/sync-live-scores/index.ts` — Deno Edge Function: fetches WC matches from football-data.org, normalizes team names, updates matches table via service-role client

## Decisions Made

- `FOOTBALL_DATA_API_KEY` is read exclusively from `Deno.env.get()` — never appears as a string literal in source
- Scores are set to `null` for `IN_PLAY`/`PAUSED` status (football-data.org free tier does not provide in-play scores; D-02/D-03 locked this decision)
- `unmatchedNames` array is included in the response body for operational visibility without incurring admin_logs writes on an automated function
- Accent stripping uses both explicit replacement chains AND `.normalize('NFD')` + combining-character regex for maximum coverage across both pre-composed and NFD Unicode forms

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Before deploying this function, the `FOOTBALL_DATA_API_KEY` Supabase secret must be set:

```bash
supabase secrets set FOOTBALL_DATA_API_KEY=<your_key_from_football-data.org>
```

Then deploy with:

```bash
supabase functions deploy sync-live-scores --no-verify-jwt
```

Configure cron-job.org to POST to `https://<project-ref>.supabase.co/functions/v1/sync-live-scores` every 2 minutes (no Authorization header needed per D-07).

## Next Phase Readiness

- Edge Function is complete and ready to deploy
- `05-04-TodayMatchesWidget` can now build the UI component that subscribes to Realtime `matches` channel — the DB writes this function produces will trigger those subscriptions
- No blockers

## Self-Check: PASSED

- FOUND: supabase/functions/sync-live-scores/index.ts
- FOUND: commit ebea13a
- FOOTBALL_DATA_API_KEY: 4 occurrences (comment header x2, env.get call x1, grep check x1)
- SUPABASE_SERVICE_ROLE_KEY: 1 occurrence (env.get call in createClient)
- external_match_id: 6 occurrences (select query, fast-path find, slow-path startsWith, equality check, update payload, alias stored)
- Authorization header check: only in a comment ("Do NOT add Authorization header checks here") — no actual check

---
*Phase: 05-live-match-widget*
*Completed: 2026-06-12*
