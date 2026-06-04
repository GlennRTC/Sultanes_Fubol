# FUBOL

## What This Is

FUBOL is a Spanish-language web app built for the FIFA World Cup 2026 that combines a match calendar, a quinielas (score predictions) game, and a Polymarket-style betting module (apuestas) — all powered by a virtual token economy. It runs entirely on free-tier infrastructure (Netlify + Supabase) with no server to manage. It starts as a closed community app where an admin distributes tokens, with plans to open to anyone later.

## Core Value

A fully playable quinielas + apuestas experience live before the World Cup's first match kicks off on June 11, 2026.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Auth**
- [ ] **AUTH-01**: User can register with username + email + password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: User can reset password via email link

**Calendar (Calendario)**
- [ ] **CAL-01**: All 48 group stage matches are visible
- [ ] **CAL-02**: Match times are shown in the user's local timezone (auto-detected, manual override persists)
- [ ] **CAL-03**: Matches are filterable by group and by team
- [ ] **CAL-04**: Match status (scheduled / live / finished) is visible

**Quinielas**
- [ ] **QUI-01**: User can predict the exact score for any scheduled match
- [ ] **QUI-02**: Prediction is blocked once a match has started or finished
- [ ] **QUI-03**: Tokens are deducted immediately on prediction submission
- [ ] **QUI-04**: Points and tokens are auto-credited when admin enters the result (exact score = 3 pts + 30 tokens; correct winner = 1 pt + 10 tokens)
- [ ] **QUI-05**: Global leaderboard ranks all users by total prediction points

**Apuestas (Bet Pools)**
- [ ] **APU-01**: Admin can create a betting pool (binary / multiple_exclusive / numeric_range) with 2–4 options and a deadline
- [ ] **APU-02**: All users can see open pools and live parimutuel odds
- [ ] **APU-03**: User can bet tokens on one option per pool before the deadline
- [ ] **APU-04**: Bets are rejected at the DB level if tokens are insufficient
- [ ] **APU-05**: Duplicate bets on the same pool are rejected (UNIQUE constraint)
- [ ] **APU-06**: Admin resolves a pool → tokens distributed proportionally to winners (no house cut)
- [ ] **APU-07**: User can see their bet history with win/loss status and tokens won

**Tokens**
- [ ] **TOK-01**: Admin can add tokens to any user
- [ ] **TOK-02**: Every token movement creates a token_transactions record (full audit trail)
- [ ] **TOK-03**: Token balance can never drop below 0 (DB constraint)

**Admin Panel**
- [ ] **ADM-01**: Admin can list, search, block, and unblock users
- [ ] **ADM-02**: Admin can reset a user's password
- [ ] **ADM-03**: Admin can add or remove tokens from a user
- [ ] **ADM-04**: Admin can enter match results manually (triggers auto-scoring)
- [ ] **ADM-05**: Admin can create a bet pool with options and deadline
- [ ] **ADM-06**: Admin can resolve a bet pool
- [ ] **ADM-07**: Admin can view a token circulation report and top predictors
- [ ] **ADM-08**: Every admin action is logged to admin_logs

**Infrastructure**
- [ ] **INF-01**: App is live on Netlify with a public URL
- [ ] **INF-02**: No unauthenticated access to protected routes
- [ ] **INF-03**: No cross-user data exposure (RLS verified on all tables)
- [ ] **INF-04**: Mobile responsive on 375px viewport (iOS Safari + Android Chrome)
- [ ] **INF-05**: Supabase anti-pause ping running on cron-job.org every 3 days
- [ ] **INF-06**: Supabase daily backups enabled

### Out of Scope

- Real money / payments — tokens are virtual gamification only; no monetary value
- OAuth / social login (Google, GitHub, magic link) — email/password is sufficient for v1
- Half-time automation for pool deadlines — admin sets deadline manually in MVP
- Custom pool types beyond binary / multiple_exclusive / numeric_range — three types cover all use cases
- Football data auto-sync at launch — seed SQL covers group stage; sync-matches Edge Function added but not critical path for June 11
- Knockout stage match creation — seeded data covers group stage only; knockouts added as tournament progresses
- Push notifications — out of scope for v1
- i18n / multi-language support — Spanish is the only target language

## Context

- **Timeline**: World Cup 2026 starts June 11, 2026 — 7 days from today (June 4). Everything is on the critical path.
- **Infrastructure**: Supabase project not yet created. Free tier pauses after 7 days of inactivity — mitigated by `ping` Edge Function + cron-job.org, which must be the first thing configured.
- **Match data**: football-data.org free API key not yet obtained. Group stage data (48 matches) will be seeded via SQL (`supabase/seed/matches_wc2026.sql`) on Day 1 so the calendar works immediately. The `sync-matches` Edge Function is built but not the launch blocker.
- **Language**: All UI copy, labels, error messages, and user-facing text are in Spanish. Code, comments, and planning docs are in English.
- **Audience**: Initially a private/closed group — admin controls who receives tokens and participates. The architecture supports opening to the public later without rework (Supabase Auth handles up to 50k MAU on free tier).
- **Development philosophy**: Spec-driven (specs/ directory is source of truth), KISS (flat structures, business logic in the DB), mobile-first.
- **Token model**: Virtual integers only. All token mutations happen exclusively through SQL functions (`place_bet`, `resolve_pool`, `calculate_prediction_points`) or the `admin-manage-user` Edge Function — never directly from the frontend.

## Constraints

- **Stack**: React 18 + Vite + TypeScript / Netlify / Supabase (Auth + PostgreSQL + Edge Functions / Deno) / TailwindCSS / Zustand / React Router v6 / date-fns + date-fns-tz — stack is fixed, no new dependencies without justification
- **Timeline**: Ship core MVP by June 11, 2026 — 7 days; quinielas and calendar are the non-negotiable minimum
- **Budget**: 100% free tier — Netlify (100GB bandwidth), Supabase (500MB DB, 500k Edge Function invocations), cron-job.org, football-data.org free tier; no credit card spend
- **Security**: RLS enabled on every table, no exceptions; service role key and football API key never exposed to the frontend; tokens never updated directly from the frontend
- **Data**: All datetimes stored in UTC; timezone conversion is frontend-only (date-fns-tz); tokens are integers only (Math.floor on all payouts)
- **Types**: `src/types/index.ts` is the single TypeScript types file — no per-feature type files

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase as full backend | Covers auth, DB, edge functions, storage, realtime — all on one free tier; eliminates need for a custom server | — Pending |
| Business logic in SQL functions | `place_bet()`, `resolve_pool()`, `calculate_prediction_points()` are atomic and race-condition safe; can't be bypassed from frontend | — Pending |
| Parimutuel odds (no house cut) | Simpler math, fairer for players, no compliance risk; all tokens redistributed to winners | — Pending |
| Seed SQL for group stage matches | Unblocks calendar and quinielas on Day 1 without needing the football-data.org API key | — Pending |
| Spanish UI, English code | Target users are Spanish-speaking; code stays readable for English-speaking contributors and AI tools | — Pending |
| Ping Edge Function as first deploy | Prevents any risk of Supabase free-tier pause during development and launch week | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-04 after initialization*
