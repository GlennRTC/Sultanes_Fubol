---
phase: 07-match-status-knockout
plan: "01"
subsystem: database
tags: [postgres, supabase, rls, security-definer, typescript]

# Dependency graph
requires: []
provides:
  - "admin_create_match SECURITY DEFINER RPC (migration file, not yet applied)"
  - "TypeScript signature for admin_create_match in Database.public.Functions"
affects: [07-02-knockout-admin-ui, 07-03-apply-migrations]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin RPC security pattern: null auth.uid() check -> private.is_admin() guard -> business logic -> admin_logs insert -> revoke/grant authenticated-only"

key-files:
  created:
    - supabase/migrations/0010_admin_create_match.sql
  modified:
    - src/types/index.ts

key-decisions:
  - "Used private.is_admin() helper-function call form (not inline exists() subquery) per CONTEXT.md's exact SQL for this RPC"
  - "p_match_datetime typed as string in TS (not Date) — Supabase JS client serializes to ISO text over the wire, consistent with create_bet_pool's p_deadline"
  - "Returns: string in TS for the uuid return type, consistent with create_bet_pool's existing Returns: string pattern"

patterns-established: []

requirements-completed:
  - admin-create-match-db
  - admin-create-match-types

# Metrics
duration: 12min
completed: 2026-06-22
---

# Phase 7 Plan 1: Admin Create Match DB Foundation Summary

**admin_create_match SECURITY DEFINER RPC migration mirroring the 0007_admin_panel.sql security pattern, plus its TypeScript signature in Database.public.Functions**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-22T18:58:00Z
- **Completed:** 2026-06-22T19:10:13Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created `supabase/migrations/0010_admin_create_match.sql` with the `admin_create_match(p_home_team, p_away_team, p_group_name, p_match_datetime, p_venue)` SECURITY DEFINER function, returning the new match's uuid
- Function follows the exact security order established in `0007_admin_panel.sql`: null-check `auth.uid()` → `private.is_admin()` guard → team validation → insert into `public.matches` (status hardcoded `'scheduled'`) → audit insert into `public.admin_logs` (action `'create_match'`) → return id
- Ends with `revoke ... from public, anon` / `grant ... to authenticated` matching every other admin RPC
- Registered `admin_create_match` in `Database.public.Functions` in `src/types/index.ts`, placed after `admin_set_match_result` and before `create_bet_pool`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 0010_admin_create_match.sql** - `dc7a98a` (feat) — combined with Task 2 in a single commit per plan instructions
2. **Task 2: Register admin_create_match in src/types/index.ts** - `dc7a98a` (feat) — same commit as Task 1 (plan specified a single combined commit)

**Plan metadata:** committed alongside SUMMARY.md, STATE.md, ROADMAP.md update (see final commit below)

## Files Created/Modified
- `supabase/migrations/0010_admin_create_match.sql` - New SECURITY DEFINER RPC for admin-only match creation; not yet applied to the live Supabase project (deferred to blocking Wave 2 plan 07-03)
- `src/types/index.ts` - Added one line registering `admin_create_match` in `Database.public.Functions`

## Decisions Made
- Followed CONTEXT.md's SQL exactly, including the `private.is_admin()` helper-function call form for the admin guard (rather than the inline `exists(select 1 from public.profiles ...)` form used in some 0007 functions) — CONTEXT.md explicitly specifies this form for this RPC and the plan instructed preserving it exactly
- `p_match_datetime` and the `Returns` value typed as `string` in TypeScript, consistent with existing `create_bet_pool` entry (Supabase JS client serializes timestamptz/uuid as text over the wire)
- No new Match-related TypeScript interface added — existing `Match` interface already covers all fields the RPC writes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Sibling Wave 1 plan (07-02) had uncommitted changes to `src/components/MatchCard.tsx`, `src/index.css`, and `src/pages/CalendarPage.tsx` present in the working tree during this plan's execution; these were correctly left unstaged and uncommitted since they are out of scope for this plan (verified via `git status --short` before staging and `git diff --stat` on `src/types/index.ts` to confirm a clean single-line diff).

## User Setup Required

None - no external service configuration required. Note: the migration file itself is NOT applied to the live Supabase project as part of this plan — that is deferred to the blocking Wave 2 plan (07-03), per plan instructions.

## Next Phase Readiness
- Migration file `0010_admin_create_match.sql` is ready to apply in Wave 2 (plan 07-03)
- TypeScript types are in place so Wave 3's `AdminMatchesPage` form will get type-checked `supabase.rpc('admin_create_match', {...})` calls
- `tsc --noEmit` exits clean (0 errors)
- No frontend files were modified in this plan, as specified

---
*Phase: 07-match-status-knockout*
*Completed: 2026-06-22*

## Self-Check: PASSED

- FOUND: supabase/migrations/0010_admin_create_match.sql
- FOUND: src/types/index.ts
- FOUND: dc7a98a (commit)
