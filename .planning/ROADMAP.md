# Roadmap: FUBOL

## Overview

Four vertical slices deliver a fully playable quinielas + apuestas experience before the World Cup's first match on June 11, 2026. Phase 1 lays the Supabase + Netlify foundation and auth. Phase 2 adds the match calendar and quinielas predictions. Phase 3 delivers the full bet-pool economy. Phase 4 completes the admin panel and ships production-quality on mobile. Post-launch phases (5-8) add live match data, a palette redesign, knockout-stage admin support, and a live-first match feed redesign.

## Phases

- [x] **Phase 1: Infrastructure + Auth** - Supabase DB, Netlify deploy, login/register/logout/reset live on a public URL (completed 2026-06-06)
- [x] **Phase 2: Calendar + Quinielas** - Match calendar in local timezone, score predictions, live leaderboard (completed 2026-06-06)
- [x] **Phase 3: Apuestas (Bet Pools)** - Token-based betting pools with live parimutuel odds and automatic payout (completed 2026-06-11)
- [x] **Phase 4: Admin Panel + QA + Production** - Full admin panel, mobile QA, RLS audit, E2E smoke test (completed 2026-06-11)
- [x] **Phase 5: Partidos del Día — Live Match Widget** - Live match status auto-updates via cron + Edge Function + Realtime (completed 2026-06-13)
- [x] **Phase 6: Palette Redesign** - Full app migration to zinc/emerald/amber dark betting palette (completed 2026-06-13)
- [ ] **Phase 7: Match Status Treatment + Knockout-Stage Admin Support** - Live match glow, finished-match accordion, admin match creation for knockout fixtures
- [ ] **Phase 8: Match Feed Redesign** - Live-first status-ordered feed with compact always-visible finished-match rows, replacing the date-grouped accordion

## Phase Details

### Phase 1: Infrastructure + Auth

**Goal:** Supabase project is fully provisioned, all DB migrations are run, the app is live on Netlify, and a user can register, log in, and log out on the public URL.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, INF-01, INF-02, INF-03, INF-05, INF-06
**Success Criteria** (what must be TRUE):

  1. A user can open the public Netlify URL, register with username + email + password, log in, and log out — all without touching the console.
  2. A logged-out user who navigates directly to a protected route (e.g., /calendario) is redirected to the login page.
  3. A user can request a password-reset email and set a new password via the link.
  4. The Supabase anti-pause ping Edge Function is deployed and a cron-job.org job calls it every 3 days.
  5. Supabase daily backups are confirmed enabled in the project settings.

**Plans:** 3/3 plans complete
**Wave 1**

- [x] 01-01-PLAN.md — Walking Skeleton: scaffold + Supabase client + types + auth store + profiles migration/RLS + live-profile HomePage

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Auth flows: ProtectedRoute + Navbar + login/registro/reset pages wired to Supabase Auth
- [x] 01-03-PLAN.md — Deployment: Netlify public URL + ping Edge Function + cron-job.org + backups

**UI hint:** yes

### Phase 2: Calendar + Quinielas

**Goal:** An authenticated user can browse all 72 group-stage matches in their local timezone, submit a score prediction with token deduction, and see the global leaderboard update when a result is entered.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** CAL-01, CAL-02, CAL-03, CAL-04, QUI-01, QUI-02, QUI-03, QUI-04, QUI-05
**Success Criteria** (what must be TRUE):

  1. All 72 group-stage matches (groups A–L) are visible on the CalendarPage, filterable by group and by team, each showing scheduled / live / finished status.
  2. Match times display in the user's detected local timezone; changing the timezone preference persists across sessions.
  3. A user can submit a score prediction for a scheduled match; their token balance decreases immediately and the prediction is visible in their history.
  4. Predicting on a match that has already started or finished is blocked (form disabled or error shown in Spanish).
  5. After an admin enters a match result, the global leaderboard reflects updated points for all users who predicted correctly.

**Plans:** 4/4 plans complete

**Wave 1**

- [x] 02-01-PLAN.md — Backend: migration 0002 (matches/predictions tables, RLS, leaderboard_view, place_prediction + calculate_prediction_points) + 72-match seed + types + authStore.updateTokens

**Wave 2** *(blocked on Wave 1)*

- [x] 02-02-PLAN.md — [BLOCKING] schema push: apply migration 0002 + load WC2026 seed to live Supabase

**Wave 3** *(blocked on Wave 2)*

- [x] 02-03-PLAN.md — Calendar + Quinielas slice: TimezonePicker + MatchCard + PredictionModal + CalendarPage (both views, filters, two-step prediction)

**Wave 4** *(blocked on Wave 3)*

- [x] 02-04-PLAN.md — Wiring + Leaderboard slice: LeaderboardPage (/tabla) + App routes/redirects + Navbar links + auth redirect updates

**UI hint:** yes

### Phase 3: Apuestas (Bet Pools)

**Goal:** An authenticated user can see all open bet pools with live parimutuel odds, place a token bet on one option before the deadline, and receive proportional token winnings when an admin resolves the pool.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** APU-01, APU-02, APU-03, APU-04, APU-05, APU-06, APU-07, TOK-01, TOK-02, TOK-03
**Success Criteria** (what must be TRUE):

  1. A user can view all open pools on BetPoolsPage, each showing live parimutuel odds (%) that update as new bets arrive.
  2. A user can bet tokens on one option per pool; the bet is rejected at the DB level if their balance is insufficient or if they have already bet on that pool.
  3. Token balance can never drop below 0 — a bet that would do so is rejected by DB constraint.
  4. Every token movement (bet placed, winnings distributed, admin credit) appears as a record in token_transactions.
  5. When an admin resolves a pool, winners receive proportional tokens with no house cut; the user's bet history shows win/loss status and tokens won.

**Plans:** 4/4 plans complete

**Wave 1**

- [x] 03-01-PLAN.md — Backend: migration 0004 (bet_pools/pool_options/bets/token_transactions tables, RLS, place_bet + resolve_pool functions, pool_option_totals view, Realtime publication) + Phase 3 types

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — [BLOCKING] schema push: apply migration 0004 to live Supabase + seed test pool + verify Realtime publication + verify resolve_pool not callable by authenticated

**Wave 3** *(blocked on Wave 2)*

- [x] 03-03-PLAN.md — Frontend slice: PoolCard + BetModal + ApuestasPage (parallel fetch, Realtime subscription, Activas/Cerradas sections, odds display, two-step bet modal)

**Wave 4** *(blocked on Wave 3)*

- [x] 03-04-PLAN.md — Wiring: /apuestas protected route in App.tsx + Apuestas NavLink in Navbar.tsx + end-to-end smoke test

**UI hint:** yes

### Phase 4: Admin Panel + QA + Production

**Goal:** All admin operations (user management, match results, pool resolution, token grants, reports) work through a protected admin UI, the app passes mobile QA at 375px, and every row-level security policy is verified.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06, ADM-07, ADM-08, INF-03, INF-04
**Success Criteria** (what must be TRUE):

  1. An admin can list, search, block, unblock, and force-reset the password of any user from the AdminUsersPage — and the action is logged to admin_logs.
  2. An admin can enter a match result from AdminMatchesPage, which triggers automatic prediction scoring with correct token and point awards.
  3. An admin can create and resolve a bet pool from AdminPoolsPage; AdminReportsPage shows token circulation totals and top predictors.
  4. The app is fully usable on a 375px viewport in both iOS Safari and Android Chrome — no horizontal scroll, no overlapping tap targets.
  5. An RLS security audit confirms no cross-user data exposure: a logged-in user cannot read or write another user's predictions, bets, or token balance.

**Plans:** 5 plans

**Wave 1**

- [x] 04-01-PLAN.md — Backend foundation: migration 0007 (private schema, private.is_admin() helper, admin_logs table + RLS, 2 new RLS policies on profiles + token_transactions, 5 admin SECURITY DEFINER functions) + AdminLog type

**Wave 2** *(blocked on Wave 1)*

- [x] 04-02-PLAN.md — [BLOCKING] schema push: apply migration 0007 to live Supabase + verify all functions, policies, and security rejection for non-admins

**Wave 3** *(blocked on Wave 2)*

- [x] 04-03-PLAN.md — Admin UI core: AdminRoute + App.tsx routing + Navbar admin link + AdminUsersPage + AdminMatchesPage + admin-reset-password Edge Function

**Wave 4** *(blocked on Wave 3)*

- [x] 04-04-PLAN.md — Admin UI pools + reports: AdminPoolsPage (create + resolve) + AdminReportsPage (token stats + leaderboard)

**Wave 5** *(blocked on Wave 4)*

- [x] 04-05-PLAN.md — Mobile QA + RLS audit + E2E smoke test + Edge Function deploy + human approval

**UI hint:** yes

### Phase 5: Partidos del Día — Live Match Widget

**Goal:** A collapsible "Partidos de Hoy" widget on CalendarPage shows today's WC2026 matches with EN VIVO / FINALIZADO status and final scores, auto-updated via cron → Edge Function → Supabase Realtime. No frontend polling. football-data.org free tier.
**Mode:** mvp
**Depends on:** Phase 4

**Wave 1**

- [x] 05-01-PLAN.md — DB: migration 0009 (external_match_id column + Realtime publication) + types update

**Wave 2** *(blocked on Wave 1)*

- [x] 05-02-PLAN.md — [BLOCKING] Schema push: apply migration 0009 to live Supabase

**Wave 3** *(blocked on Wave 2)*

- [x] 05-03-PLAN.md — Edge Function sync-live-scores (football-data.org → DB)
- [x] 05-04-PLAN.md — TodayMatchesWidget + CalendarPage integration

**Wave 4** *(blocked on Wave 3)*

- [x] 05-05-PLAN.md — Deploy + E2E verify checkpoint

**UI hint:** yes

### Phase 6: Palette Redesign

**Goal:** Migrate the entire app from the slate/green color palette to a zinc/emerald/amber dark betting-app palette, across all components and pages.
**Mode:** execute
**Depends on:** Phase 5
**Plans:** 2/2 plans complete

**Wave 1**

- [x] 06-01-PLAN.md — Migrate all component files (Navbar, MatchCard, PredictionModal, PoolCard, BetModal, TodayMatchesWidget, FullScreenSpinner, ProtectedRoute, AdminRoute) from slate/green to zinc/emerald/amber

**Wave 2** *(blocked on Wave 1)*

- [x] 06-02-PLAN.md — Migrate all page files to zinc/emerald/amber, full app-wide palette consistency

**UI hint:** yes

### Phase 7: Match Status Treatment + Knockout-Stage Admin Support

**Goal:** Live matches are visually highlighted with a pulsing glow on the calendar, finished matches collapse into a closed-by-default accordion per date/group, and admins can create new matches (including knockout-stage fixtures) through the UI instead of manual SQL.
**Mode:** execute
**Depends on:** Phase 4, Phase 5
**Success Criteria** (what must be TRUE):

  1. A live match's MatchCard shows a pulsing emerald glow/border, visually distinct from scheduled/finished cards.
  2. Within each date group on /calendario (both "Por fecha" and "Por grupo" views), finished matches are collapsed under a closed-by-default toggle; live/scheduled matches remain directly visible.
  3. Tapping a finished match inside the collapsed section still opens PredictionModal showing the prediction vs. final score.
  4. An admin can create a new match (e.g. a Round of 16 fixture) via a form in the admin panel — no SQL required.
  5. admin_create_match enforces admin-only access and logs to admin_logs, consistent with every other admin RPC.
  6. tsc --noEmit passes. No regressions to existing prediction flow or group-stage match display.

**Plans:** 3/4 plans executed

**Wave 1**

- [x] 07-01-PLAN.md — DB: migration 0010 (admin_create_match SECURITY DEFINER RPC) + types update
- [x] 07-02-PLAN.md — Frontend: live-glow keyframe + MatchCard highlight + CalendarPage finished-match accordion (both views)

**Wave 2** *(blocked on Wave 1)*

- [ ] 07-03-PLAN.md — [BLOCKING] Schema push: apply migration 0010 to live Supabase + verify admin gating

**Wave 3** *(blocked on Wave 2)*

- [x] 07-04-PLAN.md — AdminMatchesPage "Crear partido" form wired to admin_create_match

**UI hint:** yes

### Phase 8: Match Feed Redesign

**Goal:** Replace the date-grouped match list on /calendario with a status-ordered feed -- live matches first (large cards, existing glow), scheduled matches next (chronological), finished matches always-visible in a compact single-line row at the bottom. Applies to both "Por fecha" and "Por grupo" views.
**Mode:** execute
**Depends on:** Phase 7
**Success Criteria** (what must be TRUE):

  1. On /calendario, live matches render at the top in their existing full-size glowing cards.
  2. Scheduled matches render next, in chronological order, in their existing full-size cards.
  3. Finished matches render at the bottom, always visible (no toggle/accordion), in a new compact single-line row format.
  4. Tapping any finished match row still opens PredictionModal showing the prediction vs. final score, identical behavior to before.
  5. The same live -> scheduled -> finished ordering applies inside the "Por grupo" view's active group.
  6. The Grupo/Equipo filter bar still works -- filtering happens before the status split.
  7. The Phase 7 "Partidos finalizados" toggle/accordion code is fully removed (no dead code left behind).
  8. tsc --noEmit passes. No regressions to the prediction submission flow.

**Plans:** 1 plan

**Wave 1**

- [ ] 08-01-PLAN.md -- FinishedMatchRow component + CalendarPage status-ordered feed (both views) + Phase 7 accordion removal

**UI hint:** yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure + Auth | 3/3 | Complete   | 2026-06-06 |
| 2. Calendar + Quinielas | 4/4 | Complete   | 2026-06-06 |
| 3. Apuestas (Bet Pools) | 4/4 | Complete   | 2026-06-11 |
| 4. Admin Panel + QA + Production | 5/5 | Complete   | 2026-06-11 |
| 5. Live Match Widget | 5/5 | Complete | 2026-06-13 |
| 6. Palette Redesign | 2/2 | Complete | 2026-06-13 |
| 7. Match Status + Knockout Admin | 3/4 | In Progress|  |
| 8. Match Feed Redesign | 0/1 | Not Started |  |
