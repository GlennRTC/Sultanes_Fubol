---
phase: 03-apuestas-bet-pools
plan: 04
subsystem: ui
tags: [react-router, navbar, routing]

requires:
  - phase: 03-03
    provides: ApuestasPage, PoolCard, BetModal components

provides:
  - /apuestas protected route wired into App.tsx
  - Apuestas NavLink between Calendario and Tabla in Navbar.tsx
  - Full Phase 3 feature accessible end-to-end

affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/Navbar.tsx

key-decisions:
  - "Route inserted between /tabla and / redirect (not at the end) to keep redirect last"
  - "NavLink className follows identical pattern to existing Calendario and Tabla links"

patterns-established:
  - "New protected routes go inside the ProtectedRoute layout block before the catch-all redirect"

requirements-completed: [APU-02, APU-07]

duration: ~5min
completed: 2026-06-07
---

# Phase 03-04: Wire /apuestas Route + Navbar Summary

**ApuestasPage wired into protected routing and Navbar — full /apuestas bet pools feature live end-to-end**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-06-07
- **Tasks:** 2 (1 auto + 1 human smoke test)
- **Files modified:** 2

## Accomplishments
- `/apuestas` route added to App.tsx inside ProtectedRoute layout
- "Apuestas" NavLink inserted between Calendario and Tabla with correct active/inactive styles
- End-to-end smoke test approved: navigation, pool cards, bet placement flow, and auth guard all verified

## Task Commits

1. **Task 1: Wire route + NavLink** — `101fa75` (feat)
2. **Task 2: Human smoke test** — approved by user

## Files Created/Modified
- `src/App.tsx` — added ApuestasPage import and `/apuestas` Route inside ProtectedRoute block
- `src/components/Navbar.tsx` — added Apuestas NavLink between Calendario and Tabla

## Decisions Made
- Route placed between /tabla and / redirect to keep catch-all last in the protected layout

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness
- Phase 3 complete — all apuestas features live
- No blockers for future phases

---
*Phase: 03-apuestas-bet-pools*
*Completed: 2026-06-07*
