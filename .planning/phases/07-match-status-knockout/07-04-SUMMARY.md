---
phase: 07-match-status-knockout
plan: "04"
subsystem: ui
tags: [react, supabase-rpc, admin, forms, typescript]

# Dependency graph
requires:
  - phase: 07-match-status-knockout
    provides: admin_create_match RPC (migration 0010, live on Supabase, admin-only, logs to admin_logs)
provides:
  - "Crear partido" form in AdminMatchesPage.tsx for admin-driven match creation
  - Client-side Spanish validation for team names, group/round label, and datetime before RPC call
  - Local-state prepend pattern so new matches appear immediately without refetch
affects: [admin-panel, calendar, knockout-stage-fixtures]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "datetime-local input converted to UTC ISO via new Date(value).toISOString(), mirrored from AdminPoolsPage.tsx deadline field"
    - "RPC error message mapping to Spanish strings keyed on rpcErr.message, consistent with handleSetScore and AdminPoolsPage handleCreate"

key-files:
  created: []
  modified:
    - src/pages/AdminMatchesPage.tsx

key-decisions:
  - "Constructed a local Match object on success (using the RPC's returned uuid) and prepended it to existing matches state, avoiding an extra refetch round-trip"
  - "Reused the exact AdminPoolsPage 'SECTION 1 / SECTION 2' visual structure (card with h2 heading, form with flex flex-col gap-3) for consistency across admin pages"
  - "Renamed page h1 from 'Resultados de Partidos' to 'Gestión de Partidos' since the page now covers both match creation and result entry"

patterns-established:
  - "Admin forms that create resources via RPC should construct an optimistic local object from form inputs + RPC return value (id) rather than refetching, when the RPC returns just the new id"

requirements-completed: [admin-create-match-ui]

# Metrics
duration: 12min
completed: 2026-06-22
---

# Phase 7 Plan 04: Admin Create-Match Form Summary

**Added a "Crear partido" form to AdminMatchesPage.tsx that calls the admin_create_match RPC, letting admins enter knockout-stage and group-stage fixtures through the UI with Spanish validation and optimistic local-state updates.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-22T20:08:00Z
- **Completed:** 2026-06-22T20:20:47Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Admins can now create matches (including knockout fixtures like R16/QF/SF/F) through a form, no SQL required
- Client-side validation in Spanish blocks empty teams, empty group/round label, and missing datetime before any RPC call
- Datetime-local input correctly converts local time to UTC ISO string, matching the established AdminPoolsPage pattern exactly
- New match appears in the pending-results list immediately on success, no page reload or refetch needed
- RPC errors (`not_admin`, `invalid_teams`, `not_authenticated`, generic) are mapped to Spanish messages consistent with existing error-handling conventions in this file

## Task Commits

1. **Task 1: Add "Crear partido" form to AdminMatchesPage.tsx** - `11359ec` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `src/pages/AdminMatchesPage.tsx` - Added Crear partido form (home/away team, group/round label with hint, datetime-local, optional venue), `handleCreateMatch` handler calling `supabase.rpc('admin_create_match', ...)`, Spanish validation and error mapping, optimistic prepend to local matches state on success

## Decisions Made
- Used the RPC's returned uuid plus form inputs to build a local `Match` object on success rather than refetching from the DB — avoids an extra round-trip and matches the plan's explicit instruction
- Kept the existing results-list rendering, `handleSetScore`, and score inputs completely untouched per the plan's scope boundary
- Updated the page's `<h1>` to "Gestión de Partidos" (from "Resultados de Partidos") since the page now serves two purposes — this is a minor presentational adjustment within scope of adding the new section, not a deviation requiring a rule citation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The `admin_create_match` RPC (migration 0010) was already applied and verified by the user prior to this plan.

## Next Phase Readiness

Phase 7 is now feature-complete pending final verification:
1. Live highlight on MatchCard (07-01/07-02, already summarized)
2. Finished-match accordion on CalendarPage (07-01/07-02, already summarized)
3. Admin create-match form (this plan, 07-04)

Recommended final check before closing Phase 7: a manual smoke test as admin — log in, open the admin matches page, submit a knockout fixture (e.g. "México" vs "Brasil", group "R16", future datetime), confirm success message and immediate appearance in the list, then verify the same match shows on `/calendario`. Also confirm a Spanish validation error appears (and no RPC fires) when submitting with an empty team field.

---
*Phase: 07-match-status-knockout*
*Completed: 2026-06-22*

## Self-Check: PASSED
