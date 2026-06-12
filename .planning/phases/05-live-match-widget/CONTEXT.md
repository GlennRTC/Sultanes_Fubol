# Phase 5 Context: Partidos del Día — Live Match Widget

## Source
Parsed from `.planning/prd-live-scores.md`

## Phase Goal
Add a collapsible "Partidos de Hoy" widget to CalendarPage that shows today's WC2026 matches with live status (EN VIVO / FINALIZADO) and final scores, auto-updated via a cron → Edge Function → Supabase Realtime pipeline using the football-data.org free tier API.

## Mode
mvp — vertical slice (widget visible end-to-end before moving to next task)

## Locked Decisions (from PRD)

| # | Decision | Rationale |
|---|----------|-----------|
| D-01 | Architecture: cron → Edge Function → DB → Realtime (NOT frontend polling) | Frontend polling 50 users × 60s = 500k+ invocations/month, exceeds free tier. Cron = ~22k/month. |
| D-02 | football-data.org free tier only | Budget constraint: 100% free. Free tier gives status (IN_PLAY/FINISHED) and final scores. No minute-by-minute live score. |
| D-03 | Widget shows "?" score while match is live; final score when FINISHED | Free tier limitation — in-play score not available. Honest UX. |
| D-04 | Admin still enters results manually via AdminMatchesPage for prediction scoring | Edge Function does NOT trigger calculate_prediction_points. API sync is display-only. |
| D-05 | Team name normalization via strip-accents + lowercase + alias map | football-data.org uses "Mexico" vs our seed "México". First match stores external_match_id for fast subsequent lookups. |
| D-06 | Widget collapse toggle persisted in localStorage key `fubol_today_widget_open` | Survives page refresh; no DB needed for UI preference. |
| D-07 | Edge Function deployed with --no-verify-jwt | Called by cron-job.org, not user JWT. |
| D-08 | Cron interval: every 2 minutes | Rate limit: 10 req/min. 1 req/2min is safe. Free tier matches status update within seconds of real change. |

## Scope Fences (do NOT implement)
- Minute-by-minute score during match (free tier limitation)
- Automatic prediction scoring from API feed
- Match events: goals, cards, substitutions
- Tournament bracket or knockout visualization
- Push notifications
- New npm dependencies

## New Artifacts

### DB (migration 0009)
```sql
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS external_match_id integer;
CREATE INDEX IF NOT EXISTS matches_external_id_idx ON public.matches (external_match_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
```

### Edge Function
- File: `supabase/functions/sync-live-scores/index.ts`
- No JWT verification (--no-verify-jwt)
- Uses service role key (available as env var in Edge Functions)
- Secret needed: `FOOTBALL_DATA_API_KEY`

### New Component
- `src/components/TodayMatchesWidget.tsx`

### Modified Files
- `src/pages/CalendarPage.tsx` — add TodayMatchesWidget at top
- `src/types/index.ts` — add external_match_id to Match type

## API Reference

**Endpoint:** `GET https://api.football-data.org/v4/competitions/WC/matches?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
**Auth header:** `X-Auth-Token: {FOOTBALL_DATA_API_KEY}`
**Status values:** `SCHEDULED` | `TIMED` | `IN_PLAY` | `PAUSED` | `FINISHED`
**Score fields:** `score.fullTime.home` / `score.fullTime.away` (null until FINISHED)
**Team field:** `homeTeam.name` / `awayTeam.name`
**Match ID field:** `id` (integer) → stored as `external_match_id`

## Status Mapping (API → DB)
```
IN_PLAY | PAUSED  → 'live'
FINISHED           → 'finished'
SCHEDULED | TIMED  → 'scheduled' (no update needed)
```

## Widget UI Spec
```
┌─────────────────────────────────────────────┐
│  Partidos de hoy              [▲ collapse]  │
│  ┌────────────────┐  ┌────────────────┐     │
│  │ 🟢 EN VIVO    │  │ ✅ FINALIZADO  │     │
│  │ México         │  │ Brasil  2      │     │
│  │  ?  -  ?       │  │ ─────────────  │     │
│  │ Camerún        │  │ Argentina 1    │     │
│  └────────────────┘  └────────────────┘     │
└─────────────────────────────────────────────┘
```
- Horizontal scroll on mobile (shrink-0 cards)
- Hidden entirely when no matches today
- Collapsed state: only header + chevron visible
- localStorage key: `fubol_today_widget_open` (boolean, default true)

## Success Criteria (from PRD)
1. Cron calls sync-live-scores every 2 min — updates matches status/scores
2. When match goes IN_PLAY → widget shows 🟢 EN VIVO within 2 min, no page refresh
3. When match ends → widget shows ✅ FINALIZADO + final score within 2 min
4. Widget hidden when no matches today
5. Widget scrolls horizontally at 375px without body scroll
6. No frontend polling — updates via Supabase Realtime only
7. FOOTBALL_DATA_API_KEY never exposed in frontend bundle

## Existing Patterns to Follow
- Edge Function style: `supabase/functions/admin-reset-password/index.ts` (Deno.serve pattern)
- Component style: `src/components/TodayMatchesWidget.tsx` → follow AdminRoute.tsx / FullScreenSpinner.tsx patterns
- Realtime subscription: `src/pages/ApuestasPage.tsx` (existing Realtime example in codebase)
- localStorage timezone: `localStorage.getItem('fubol_timezone')` pattern in AdminPoolsPage.tsx
