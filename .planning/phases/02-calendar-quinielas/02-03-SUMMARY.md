---
phase: 02-calendar-quinielas
plan: 03
subsystem: ui
tags: [react, typescript, supabase, date-fns-tz, zustand, tailwind]

requires:
  - phase: 02-01
    provides: Match/Prediction/LeaderboardEntry types, updateTokens action, place_prediction RPC
  - phase: 02-02
    provides: live matches + predictions tables, place_prediction callable

provides:
  - TimezonePicker component with 15 IANA timezones, detectTimezone, saveTimezone
  - MatchCard with local time display, status badges, prediction badge
  - PredictionModal with three render modes, place_prediction RPC call, error map, updateTokens wiring
  - CalendarPage with Por fecha + Por grupo views, group/team filters, timezone bar, modal orchestration

affects: [02-04]

tech-stack:
  added: []
  patterns: [formatInTimeZone-for-display, supabase-rpc-call, zustand-imperative-update, parallel-fetch-promise-all]

key-files:
  created:
    - src/components/TimezonePicker.tsx
    - src/components/MatchCard.tsx
    - src/components/PredictionModal.tsx
    - src/pages/CalendarPage.tsx
  modified:
    - src/types/index.ts (added place_prediction to Database.Functions)

key-decisions:
  - "Use formatInTimeZone (not utcToZonedTime) for date-fns-tz v3 API"
  - "Group Por fecha by LOCAL date using toZonedTime key, never UTC substring"
  - "PredictionModal calls updateTokens(-20) BEFORE onClose to avoid stale Navbar balance"
  - "MatchCard is always clickable even when locked (D-05/D-09)"
  - "Error map keys: insufficient_tokens, match_not_scheduled, 23505 (unique violation)"

patterns-established:
  - "Pattern: RPC error map — error.message.includes('key') for string matching"
  - "Pattern: parallel fetch — Promise.all([supabase.from(...), supabase.from(...)])"
  - "Pattern: local-date grouping — toZonedTime + format for Map key"

requirements-completed: [CAL-01, CAL-02, CAL-03, CAL-04, QUI-01, QUI-02, QUI-03]

duration: 110min
completed: 2026-06-06
---

# Plan 02-03: Calendar + Prediction UI Summary

**Full quinielas vertical slice — 72-match calendar with Por fecha/Por grupo views, local timezone, and two-step prediction modal wired to place_prediction RPC**

## Performance

- **Duration:** ~110 min
- **Completed:** 2026-06-06
- **Tasks:** 3 auto + 1 human-verify
- **Files modified:** 5

## Accomplishments
- `TimezonePicker` exports 15 IANA timezone entries (LatAm + Spain + UTC), `detectTimezone` (localStorage → browser → UTC fallback), `saveTimezone` writing `fubol_timezone` key
- `MatchCard` renders teams, `formatInTimeZone` local time, status badge (Programado/En vivo/Finalizado), prediction badge when `prediction` prop present; always clickable per D-05/D-09
- `PredictionModal` three-mode rendering: read-only existing, locked no-prediction, editable two-step; calls `supabase.rpc('place_prediction')`, maps all four error cases to Spanish copy; calls `updateTokens(-20)` before close (Pitfall 5)
- `CalendarPage` parallel-fetches matches + predictions; Por fecha view groups by LOCAL date using `toZonedTime` key (Pitfall 2); Por grupo renders 12 tabs A–L; group + team dropdowns with Todos reset; timezone bar with Cambiar; modal orchestration with immediate prediction badge on success

## Task Commits

1. **Task 1: TimezonePicker** — `bde081b`
2. **Task 2: MatchCard + PredictionModal** — `243bd6f`
3. **Task 3: CalendarPage** — `7793515`

## Files Created/Modified
- `src/components/TimezonePicker.tsx` — timezone picker modal, utilities, SUPPORTED_TIMEZONES
- `src/components/MatchCard.tsx` — match display with local time, badges
- `src/components/PredictionModal.tsx` — prediction entry/confirm/read-only modal
- `src/pages/CalendarPage.tsx` — main calendar page, both views, filters, modal wiring
- `src/types/index.ts` — added `place_prediction` to `Database.Functions` (auto-fix for RPC type inference)

## Decisions Made
- Use `formatInTimeZone` (not `utcToZonedTime`) for all date-fns-tz v3 display — v2 API banned per RESEARCH Pitfall 8
- Group Por fecha by LOCAL date via `toZonedTime` key to avoid UTC-midnight split (Pitfall 2)
- `updateTokens(-20)` called imperatively BEFORE `onClose()` per Pitfall 5 to prevent stale balance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing type] Added place_prediction to Database.Functions**
- **Found during:** Task 2 (PredictionModal RPC call)
- **Issue:** TypeScript inferred `rpc('place_prediction', ...)` as `void` without a `Database.Functions` entry
- **Fix:** Added `place_prediction: { Args: { p_match_id: string; p_home_score: number; p_away_score: number }; Returns: void }` to `Database['public']['Functions']` in `src/types/index.ts`
- **Verification:** `tsc --noEmit` clean
- **Committed in:** `243bd6f`

## Issues Encountered
None beyond the auto-fix above.

## Next Phase Readiness
- Calendar and prediction UI fully built and compiling
- Awaiting Plan 04 to mount `/calendario` and `/tabla` routes and add Navbar links
- Human verification deferred to after Plan 04 ships (route not yet mounted)

---
*Phase: 02-calendar-quinielas*
*Completed: 2026-06-06*
