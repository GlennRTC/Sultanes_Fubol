---
phase: 08-match-feed-redesign
plan: "01"
subsystem: ui
tags: [react, typescript, tailwind, calendar, match-feed]

# Dependency graph
requires:
  - phase: 07-match-status-knockout
    provides: live-glow styling on MatchCard, finished-match accordion (now retired), admin match creation
provides:
  - "Status-ordered match feed (live -> scheduled -> finished) replacing date-grouped accordion on CalendarPage"
  - "FinishedMatchRow component: compact single-line finished-match row, MatchCard-prop-compatible"
affects: [calendar, match-feed, predictions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Derived status arrays (live/scheduled/finished) computed via filter+sort directly from already-filtered match list, no intermediate grouping structure"
    - "Compact row components mirror full card components' prop shape for drop-in interchangeability (FinishedMatchRow mirrors MatchCardProps)"

key-files:
  created:
    - src/components/FinishedMatchRow.tsx
  modified:
    - src/pages/CalendarPage.tsx

key-decisions:
  - "Status (live -> scheduled -> finished) replaces date as the primary feed ordering mechanism, per CONTEXT.md locked decision 1"
  - "Finished matches are always visible (no toggle/accordion) — Phase 7's openFinished/toggleFinished accordion fully removed"
  - "FinishedMatchRow renders flag/team/score/team/flag only, no venue/status-badge/meta row — position in feed implies 'finished'"

patterns-established:
  - "Inline prop interfaces per component file (no shared/centralized type file for component props), matching existing MatchCardProps convention"

requirements-completed: [live-first-feed-ordering, compact-finished-rows, remove-finished-accordion]

# Metrics
duration: 12min
completed: 2026-06-24
---

# Phase 8 Plan 01: Match Feed Redesign Summary

**Live-first status-ordered match feed (live -> scheduled -> finished) with a new compact FinishedMatchRow component, fully retiring Phase 7's date-grouped accordion.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-06-24
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created `FinishedMatchRow.tsx`, a compact single-line component (flag · team · score · team · flag) with the same prop shape as `MatchCard` for drop-in use, reusing `getCountryCode` for flags and identical click/keydown wiring so `PredictionModal` still opens on tap
- Rewrote `CalendarPage.tsx`'s match-rendering logic in both "Por fecha" and "Por grupo" views to a status-ordered feed: live matches first (full `MatchCard`, existing glow), scheduled next (chronological, full `MatchCard`), finished last (compact `FinishedMatchRow`, always visible under a static "Finalizados" label)
- Fully removed Phase 7's accordion code: `openFinished` state, `toggleFinished()`, the toggle button, and chevron SVG in both views
- Removed `groupMatchesByLocalDate()` and `formatDateHeader()` — no longer used now that date is not the primary grouping mechanism (date remains visible per-match via `MatchCard`'s existing `displayTime`)

## Task Commits

Each task was committed as a single combined commit per plan instructions:

1. **Task 1: Create FinishedMatchRow.tsx** + **Task 2: Rewrite CalendarPage.tsx** - `5a9436e` (feat)

## Files Created/Modified
- `src/components/FinishedMatchRow.tsx` - New compact single-line finished-match row component, MatchCard-prop-compatible, zinc/emerald palette only
- `src/pages/CalendarPage.tsx` - Replaced date-grouped accordion rendering with live -> scheduled -> finished derived-array rendering in both Por fecha and Por grupo views; removed all Phase 7 accordion state/helpers

## Decisions Made
- Combined both tasks into the single commit specified by the plan (`feat(08-01): live-first status feed with compact finished rows`) rather than two separate per-task commits, per the plan's explicit "Commit: Single commit" instruction — this takes precedence over the default one-commit-per-task protocol for this plan.
- Kept `timezone` in `FinishedMatchRowProps` for prop-shape parity with `MatchCardProps` even though it is unused in the render body (per plan instruction), omitting it from destructuring to avoid an unused-variable warning.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None - this plan is a pure client-side UI reorganization (new component, derived-array filter/sort, removed dead state); no new data flow, no new auth surface, no new external input, consistent with the plan's threat_model disposition of "accept."

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CalendarPage now presents a single status-ordered feed in both views with zero leftover Phase 7 accordion code
- `npx tsc --noEmit` passes with no new TypeScript errors
- Ready for any follow-on visual polish (e.g., empty-state copy, "Finalizados" label styling) in a future plan if desired

---
*Phase: 08-match-feed-redesign*
*Completed: 2026-06-24*

## Self-Check: PASSED
