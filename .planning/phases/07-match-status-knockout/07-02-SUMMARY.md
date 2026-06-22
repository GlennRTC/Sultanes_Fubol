---
phase: 07-match-status-knockout
plan: "02"
subsystem: ui
tags: [react, tailwind, css-animation, calendar, accordion]

# Dependency graph
requires:
  - phase: 07-match-status-knockout
    provides: Match.status field (scheduled/live/finished) already in src/types/index.ts
provides:
  - live-glow CSS keyframe + class in src/index.css for pulsing emerald MatchCard highlight
  - Conditional live-glow application in MatchCard.tsx when match.status === 'live'
  - Closed-by-default "Partidos finalizados" accordion in CalendarPage.tsx for both Por fecha and Por grupo views
affects: [calendar, match-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "live-glow keyframe mirrors existing fire-row-glow/ice-row-glow pulse pattern (box-shadow + border-color, ~2s cycle) but in emerald tones"
    - "Per-section accordion state via useState<Set<string>> keyed by dateKey (Por fecha) or `group-${activeGroup}` (Por grupo) — local only, not localStorage"

key-files:
  created: []
  modified:
    - src/index.css
    - src/components/MatchCard.tsx
    - src/pages/CalendarPage.tsx

key-decisions:
  - "Reused the existing fire-row-glow/ice-row-glow CSS keyframe structure for live-glow, swapping in emerald-500 RGB values (rgba(16,185,129,...)) rather than the orange/blue tones used by leaderboard fire/ice effects."
  - "Accordion open/closed state stored in component-level useState (Set<string>), not localStorage, per CONTEXT.md decision 2 — this list changes daily so persistence adds little value."
  - "Toggle keys are dateKey for Por fecha and `group-${activeGroup}` for Por grupo, so switching group tabs does not leak open/closed state across unrelated groups."

requirements-completed: [live-match-glow, finished-match-accordion]

# Metrics
duration: 12min
completed: 2026-06-22
---

# Phase 7 Plan 02: Live Glow + Finished Match Accordion Summary

**Pulsing emerald live-glow CSS animation on MatchCard plus closed-by-default finished-match accordions in both CalendarPage views, using local component state.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-22T18:58:00Z
- **Completed:** 2026-06-22T19:10:53Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Added `@keyframes live-glow` and `.live-glow` class to `src/index.css`, mirroring the `fire-row-glow`/`ice-row-glow` pattern in emerald tones — pulsing box-shadow (inset + outer glow) and border-color over a 2s cycle.
- `MatchCard.tsx` now applies `live-glow border-emerald-500` conditionally when `match.status === 'live'`, leaving scheduled/finished cards unchanged. Live matches remain in their existing date/group position (no separate section).
- `CalendarPage.tsx` Por fecha view: each date group now splits matches into `liveOrScheduled` (rendered directly, unchanged behavior) and `finishedMatches` (rendered under a closed-by-default toggle button with rotating chevron and `aria-expanded`), keyed per `dateKey`.
- `CalendarPage.tsx` Por grupo view: identical split applied to the active group's matches, toggle keyed by `` `group-${activeGroup}` `` so switching group tabs doesn't carry over unrelated open/closed state.
- Finished matches inside an opened accordion still render via `MatchCard` with `onCardClick={setSelectedMatch}`, so tapping them opens `PredictionModal` exactly as before.

## Task Commits

Each task was committed atomically (single combined commit per plan instruction):

1. **Task 1: Add live-glow keyframe to index.css and apply it conditionally in MatchCard.tsx** — part of `83d537f`
2. **Task 2: Split finished matches into a closed-by-default accordion in CalendarPage (both views)** — part of `83d537f`

**Commit:** `83d537f` — `feat(07-02): add live match glow and collapse finished matches`

_Note: Plan specified a single combined commit for both tasks; both tasks were verified independently before committing together._

## Files Created/Modified
- `src/index.css` — added `@keyframes live-glow` (emerald pulse, 2s cycle) and `.live-glow` class; existing `fire-row-glow`, `ice-row-glow`, `.row-fire`, `.row-ice`, `.rank-flame`, `.rank-ice`, `.brand-glow`, `.login-bg` untouched.
- `src/components/MatchCard.tsx` — root div className changed to a template literal that appends `' live-glow border-emerald-500'` when `match.status === 'live'`.
- `src/pages/CalendarPage.tsx` — added `openFinished` state + `toggleFinished` helper; Por fecha view's date-group map and Por grupo view's active-group filter both now split into `liveOrScheduled`/`finishedMatches` with a collapsible toggle button for the finished set.

## Decisions Made
- Emerald RGB `rgba(16, 185, 129, ...)` chosen for live-glow per CONTEXT.md instruction (emerald-500), distinct from fire's orange and ice's blue.
- Toggle button styled as a compact single-line row (not a full header bar with its own top/bottom border like `TodayMatchesWidget`) since it's a sub-section within a date/group block, not a standalone page widget.
- No new dependencies; no changes to `groupMatchesByLocalDate`, `formatDateHeader`, fetch logic, filters, or PredictionModal wiring.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Live highlight and finished-match accordion are complete and visually verifiable on `/calendario` once a match's `status` is `live` or `finished` in the database.
- This plan has zero DB dependency and ran independently of Wave 1 sibling plan 07-01 (admin_create_match migration + types) — no file overlap, both can land in any order.
- No blockers for subsequent phase work (admin match creation UI, per CONTEXT.md item 5).

---
*Phase: 07-match-status-knockout*
*Completed: 2026-06-22*

## Self-Check: PASSED

- FOUND: src/index.css
- FOUND: src/components/MatchCard.tsx
- FOUND: src/pages/CalendarPage.tsx
- FOUND: commit 83d537f
- FOUND: @keyframes live-glow in src/index.css
- FOUND: finishedMatches in src/pages/CalendarPage.tsx
