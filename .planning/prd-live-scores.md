# PRD: Partidos del Día — Live Match Status Widget

## Summary

Add a "Partidos de Hoy" widget to the top of CalendarPage that shows today's World Cup matches with real-time status (EN VIVO / FINALIZADO) and scores. Scores are pulled automatically from football-data.org every 2 minutes via a cron job → Edge Function → Supabase Realtime pipeline. The admin's manual result entry (AdminMatchesPage) remains the source of truth for prediction scoring.

## Problem

Users have no way to know which matches are currently being played or see scores without leaving the app. The admin must manually enter every result to trigger scoring — there is no automatic score feed.

## Non-Goals

- No minute-by-minute live score (football-data.org free tier does not provide in-play scores)
- No automatic prediction scoring from the API — admin still enters results via AdminMatchesPage
- No new npm dependencies

## Architecture

```
cron-job.org (every 2 min)
  → GET /v4/competitions/WC/matches?dateFrom=TODAY&dateTo=TODAY  [football-data.org]
  → Supabase Edge Function: sync-live-scores
      - For each API match: find matching row in matches table by home_team + away_team + date
      - Update matches.status ('live' | 'finished') and matches.home_score / away_score
  → matches table (Supabase Realtime broadcast)
  → CalendarPage Realtime subscription → widget re-renders
```

**Why not frontend polling:** 50 users × every 60s = 500k+ invocations/month, exceeds free tier. One cron call per 2 minutes = ~22k invocations/month.

## API: football-data.org

- **Endpoint:** `GET https://api.football-data.org/v4/competitions/WC/matches`
- **Query params:** `dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- **Auth:** `X-Auth-Token: {FOOTBALL_DATA_API_KEY}` header
- **Free tier status values:** `SCHEDULED` | `TIMED` | `IN_PLAY` | `PAUSED` | `FINISHED`
- **Score fields:** `score.fullTime.home` / `score.fullTime.away` (null until finished)
- **Rate limit:** 10 req/min — well within 1 req/2min cron cadence
- **WC2026 coverage:** Included in free Plan CL (12 competitions)
- **API key:** Must be stored as Supabase secret `FOOTBALL_DATA_API_KEY` — never exposed to frontend

## DB Changes (migration 0009)

```sql
-- 1. Add external_match_id to link our matches to football-data.org IDs
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS external_match_id integer;
CREATE INDEX IF NOT EXISTS matches_external_id_idx ON public.matches (external_match_id);

-- 2. Enable Realtime on matches table (currently only bets is in publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
```

### Team name normalization strategy

football-data.org national team names (e.g. "Mexico", "United States") may differ from our seed data (e.g. "México", "USA"). The Edge Function will normalize both sides: strip accents, lowercase, map known aliases (USA→"United States", "México"→"Mexico"). On first successful match, store `external_match_id` on the DB row for fast lookup on subsequent calls.

## Edge Function: sync-live-scores

File: `supabase/functions/sync-live-scores/index.ts`

```
1. Fetch today's WC matches from football-data.org
2. For each API match:
   a. If external_match_id is known in DB → look up by that column (fast path)
   b. Else → match by normalized home_team + away_team + date (slow path), then save external_match_id
3. Map API status → DB status:
   IN_PLAY | PAUSED → 'live'
   FINISHED         → 'finished'
   SCHEDULED | TIMED → 'scheduled' (no change)
4. UPDATE matches SET status = ..., home_score = ..., away_score = ..., updated_at = now()
   WHERE id = matched_row_id AND (status != new_status OR home_score != new_home OR away_score != new_away)
5. No auth required on the function (called by cron, not users) — use service role key
6. No admin_logs entry (automated sync, not admin action)
```

Does NOT trigger `calculate_prediction_points` — admin retains control over official scoring.

**Secrets needed:**
- `FOOTBALL_DATA_API_KEY` — football-data.org API key
- `SUPABASE_URL` — already available in Edge Function env
- `SUPABASE_SERVICE_ROLE_KEY` — already available in Edge Function env

**Deploy:** `supabase functions deploy sync-live-scores --no-verify-jwt`
(`--no-verify-jwt` because the caller is cron-job.org, not a user JWT)

## Cron Job (cron-job.org)

- URL: `https://{PROJECT_REF}.supabase.co/functions/v1/sync-live-scores`
- Header: `Authorization: Bearer {SUPABASE_ANON_KEY}` (or service role — both work with --no-verify-jwt)
- Schedule: every 2 minutes (`*/2 * * * *`)
- Only runs during World Cup dates (Jun 11 – Jul 19, 2026) — can leave it running, it's a no-op when no matches today

## Frontend: "Partidos de Hoy" widget

### Placement
Top of `CalendarPage`, above the group tabs. Visible only when there are matches today. Collapses to nothing when no matches scheduled today.

### Widget UI (small, horizontal scroll on mobile)
```
┌──────────────────────────────────────────────┐
│  Partidos de hoy                             │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │ 🟢 EN VIVO      │  │ ✅ FINALIZADO   │   │
│  │ México vs Cam.  │  │ Brasil 2-1 Arg. │   │
│  │ ? - ?           │  │                 │   │
│  └─────────────────┘  └─────────────────┘   │
└──────────────────────────────────────────────┘
```

### Component: TodayMatchesWidget
- Reads `matches` where `match_datetime::date = today (UTC)`
- Subscribes to Supabase Realtime `matches` table changes
- On change: re-fetches today's matches (or applies delta from Realtime payload)
- Shows badge: 🟢 EN VIVO (status=live), ✅ FINALIZADO (status=finished), ⏰ {hora local} (status=scheduled)
- Score shown only when finished (live score not available on free tier — shows "?" while live)
- Uses existing `formatInTimeZone` for match time display

### Collapse toggle
- Header row has a chevron button (▲/▼) to collapse/expand the widget
- Collapsed state: only the "Partidos de hoy" header + chevron visible (no match cards)
- Preference persisted in `localStorage` key `fubol_today_widget_open` (boolean, default `true`)
- Widget still subscribes to Realtime even when collapsed (so expanding shows fresh data)

### Modified files
- `src/pages/CalendarPage.tsx` — import and render `<TodayMatchesWidget />`
- `src/components/TodayMatchesWidget.tsx` — new component

## Success Criteria

1. Cron job calls `sync-live-scores` every 2 minutes — function updates `matches` table status and scores
2. When a match goes `IN_PLAY`, the CalendarPage widget shows 🟢 EN VIVO within 2 minutes, without page refresh
3. When a match ends, the widget shows ✅ FINALIZADO and the final score within 2 minutes
4. Widget is not shown on days with no WC matches
5. Widget scrolls horizontally on 375px without causing body scroll
6. No frontend polling — all updates arrive via Supabase Realtime
7. `FOOTBALL_DATA_API_KEY` is never exposed in frontend bundle or network requests

## Out of Scope

- Automatic prediction scoring from API (admin still uses AdminMatchesPage)
- Match events (goals, cards, substitutions)
- Tournament bracket / knockout stage visualization
- Push notifications

## Estimated Complexity

| Component | Effort |
|-----------|--------|
| Migration 0009 (external_match_id + Realtime) | Trivial |
| Edge Function sync-live-scores | Medium (team name normalization is the hard part) |
| TodayMatchesWidget component | Small |
| CalendarPage integration | Trivial |
| Cron job setup | Trivial (manual step) |
