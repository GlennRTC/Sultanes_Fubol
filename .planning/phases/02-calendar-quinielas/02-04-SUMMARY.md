---
phase: 02-calendar-quinielas
plan: 04
subsystem: ui
tags: [react, react-router-dom, typescript, supabase, tailwind]

requires:
  - phase: 02-01
    provides: leaderboard_view type, LeaderboardEntry type
  - phase: 02-02
    provides: live leaderboard_view queryable
  - phase: 02-03
    provides: CalendarPage, TimezonePicker, MatchCard, PredictionModal

provides:
  - LeaderboardPage querying leaderboard_view, ranked by leaderboard_points
  - /calendario and /tabla protected routes
  - / and /bienvenido redirect to /calendario
  - Navbar Calendario + Tabla NavLinks with active-state highlight
  - Post-login and post-registro redirects updated to /calendario

affects: []

tech-stack:
  added: []
  patterns: [navlink-active-class, supabase-view-query, protected-route-layout]

key-files:
  created:
    - src/pages/LeaderboardPage.tsx
  modified:
    - src/App.tsx
    - src/components/Navbar.tsx
    - src/pages/LoginPage.tsx
    - src/pages/RegistroPage.tsx

key-decisions:
  - "LeaderboardPage queries leaderboard_view (not profiles) per Pitfall 7"
  - "Redirects / and /bienvenido to /calendario (D-18)"
  - "NavLink className callback used for active-state styling (D-17)"
  - "LoginPage from-fallback and authenticated-redirect both changed from /bienvenido to /calendario (D-19)"

patterns-established:
  - "Pattern: NavLink active state — ({ isActive }) => isActive ? activeClass : inactiveClass"
  - "Pattern: leaderboard query — from('leaderboard_view').select().order('leaderboard_points',{ascending:false}).limit(100)"

requirements-completed: [QUI-04, QUI-05, CAL-01]

duration: 25min
completed: 2026-06-06
---

# Plan 02-04: Route Wiring + Leaderboard Summary

**Phase 2 fully wired — /calendario default home, /tabla leaderboard from leaderboard_view, Navbar links, and post-auth redirects updated**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-06-06
- **Tasks:** 2 auto + 1 human-verify
- **Files modified:** 5

## Accomplishments
- `LeaderboardPage` fetches `leaderboard_view` ordered by `leaderboard_points` desc; renders `#`, `Usuario`, `Puntos`, `Fichas` columns; highlights own-user row; shows empty state when no points yet
- `App.tsx` mounts `/calendario` and `/tabla` as protected routes; `/` and `/bienvenido` redirect to `/calendario`; `HomePage` no longer imported
- `Navbar.tsx` adds `NavLink` Calendario + Tabla links with green active-state, slate-300 inactive
- `LoginPage.tsx` and `RegistroPage.tsx` redirect targets updated from `/bienvenido` → `/calendario`
- `npm run build` passes

## Task Commits

1. **Task 1: LeaderboardPage** — `c9bf5f0`
2. **Task 2: App routing + Navbar + redirects** — `23cb2e3`

## Files Created/Modified
- `src/pages/LeaderboardPage.tsx` — ranked leaderboard from leaderboard_view, own-row highlight, empty state
- `src/App.tsx` — /calendario + /tabla routes, / + /bienvenido redirects, removed HomePage
- `src/components/Navbar.tsx` — Calendario + Tabla NavLinks with active state
- `src/pages/LoginPage.tsx` — redirect /bienvenido → /calendario
- `src/pages/RegistroPage.tsx` — redirect /bienvenido → /calendario

## Decisions Made
- Used `leaderboard_view` (not `profiles`) for the leaderboard query per Pitfall 7 and security contract (no is_admin/is_blocked exposure)
- NavLink className callback pattern for active-state styling

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Phase 2 fully reachable end-to-end: login → /calendario → predict → /tabla
- QUI-04 (scoring) and QUI-05 (leaderboard) satisfied
- Ready for Phase 3 (apuestas betting module) or Phase 4 (admin scoring UI)

---
*Phase: 02-calendar-quinielas*
*Completed: 2026-06-06*
