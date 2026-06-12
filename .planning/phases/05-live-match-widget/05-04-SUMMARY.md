---
phase: 05-live-match-widget
plan: "04"
subsystem: ui
tags: [react, supabase-realtime, date-fns-tz, localstorage, tailwindcss]

# Dependency graph
requires:
  - phase: 05-live-match-widget
    provides: "Supabase Realtime publication on matches table (migration 0009 from plan 05-01)"
provides:
  - "TodayMatchesWidget component with Realtime live score updates and collapse toggle"
  - "CalendarPage integrated with TodayMatchesWidget at top of page"
affects:
  - 05-05-live-match-widget
  - any future phase modifying CalendarPage or adding match-status display

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase Realtime postgres_changes subscription with cleanup on unmount (same pattern as ApuestasPage)"
    - "localStorage collapse toggle with lazy useState initializer"
    - "UTC date range computation using Date.UTC for today's match boundary queries"
    - "Conditional null return for widget hiding (return null when no data)"

key-files:
  created:
    - src/components/TodayMatchesWidget.tsx
  modified:
    - src/pages/CalendarPage.tsx

key-decisions:
  - "Widget receives timezone as prop from CalendarPage (timezone state already existed there)"
  - "Realtime on UPDATE only (INSERT not needed — today's matches loaded on mount)"
  - "Score display: ? - ? while live per D-03 (free tier has no in-play score)"
  - "Widget returns null when matches.length === 0 after loading (no empty state)"
  - "FOOTBALL_DATA_API_KEY never referenced in frontend — widget uses anon key only"

patterns-established:
  - "TodayMatchesWidget pattern: self-contained component with own fetch + Realtime subscription, receives timezone as prop"
  - "Collapse toggle pattern: lazy useState from localStorage + setItem in toggle handler"

requirements-completed: [live-scores-widget, live-scores-calendar-integration]

# Metrics
duration: 11min
completed: 2026-06-12
---

# Phase 5 Plan 04: TodayMatchesWidget Summary

**Collapsible today's matches widget with Supabase Realtime UPDATE subscription, localStorage collapse toggle, and horizontal-scroll card row integrated at the top of CalendarPage**

## Performance

- **Duration:** 11 min
- **Started:** 2026-06-12T22:22:02Z
- **Completed:** 2026-06-12T22:33:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/components/TodayMatchesWidget.tsx` — self-contained component that fetches today's matches (UTC date range), subscribes to Supabase Realtime UPDATE events on the matches table, and renders collapsible horizontal-scroll match cards
- Status badges correctly differentiate: EN VIVO (green) / FINALIZADO (slate) / scheduled time in user's timezone
- Score display follows D-03: "? - ?" while live, final score when finished, nothing when scheduled
- Integrated widget into CalendarPage above the h1 heading — widget is the first thing rendered inside max-w-3xl
- No new npm dependencies; no FOOTBALL_DATA_API_KEY reference in frontend

## Task Commits

1. **Task 1 + Task 2: TodayMatchesWidget + CalendarPage integration** - `2aa2904` (feat)

## Files Created/Modified
- `src/components/TodayMatchesWidget.tsx` - Collapsible today's matches widget with Realtime subscription and localStorage collapse toggle
- `src/pages/CalendarPage.tsx` - Added TodayMatchesWidget import and render at top of page content

## Decisions Made
- Widget receives `timezone` prop from CalendarPage (not reading from localStorage again — CalendarPage already manages timezone state)
- Realtime channel subscribes to UPDATE events only; INSERT is unnecessary since the fetch on mount captures any matches already in the DB for today
- Widget returns `null` (not a skeleton or empty state) when no matches today, per success criteria #4
- Added accessible keyboard handler (Enter/Space) on the toggle div for a11y

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing TypeScript errors in `AdminReportsPage.tsx` and `LeaderboardPage.tsx` (missing `get_leaderboard` in Database.Functions type) were confirmed pre-existing via git stash verification — not introduced by this plan.

## Known Stubs
None. Widget renders real data from Supabase. Scores display as "? - ?" for live matches per design decision D-03 (not a stub — intentional honest UX for free tier API limitation).

## Threat Flags
None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. Widget uses anon key only; FOOTBALL_DATA_API_KEY not referenced anywhere in frontend.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TodayMatchesWidget is complete and wired to CalendarPage
- Realtime pipeline is ready: when the Edge Function (plan 05-03) updates match status/scores in the DB, Realtime delivers the change to the widget within seconds
- Plan 05-05 (if any) can build on top of the live widget or close out the phase

---
*Phase: 05-live-match-widget*
*Completed: 2026-06-12*
