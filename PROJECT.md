# FUBOL

World Cup 2026 web app for a private group of friends — match calendar, score predictions (quinielas), and Polymarket-style token betting pools (apuestas). Runs entirely on free-tier infrastructure with no server to manage.

## What It Does

| Module | Description |
|--------|-------------|
| **Calendario** | Full WC2026 schedule in the user's local timezone, filterable by group/team |
| **Quinielas** | Predict match scores, earn points + tokens automatically when results are entered |
| **Apuestas** | Parimutuel betting pools per match — dynamic odds, admin creates and resolves |
| **Admin Panel** | User management, match result entry, pool management, token distribution, reports |

Tokens are virtual only — no real money, no payment integration. Admins mint and distribute them freely.

## Stack (100% Free Tier)

| Layer | Service |
|-------|---------|
| Frontend | React 18 + Vite + TypeScript → **Netlify** |
| Styling | TailwindCSS v3 |
| State | Zustand |
| Routing | React Router v6 |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Backend logic | Supabase Edge Functions (Deno) |
| File Storage | Supabase Storage (flag images) |
| Anti-pause cron | cron-job.org pings `/ping` every 3 days |
| Match data | football-data.org free API (WC2026 included) |
| Date/Timezone | `date-fns` + `date-fns-tz` |

> The Supabase free tier pauses after 7 days of inactivity. A `ping` Edge Function runs a trivial DB query; cron-job.org calls it every 3 days.

## Project Structure

```
fubol/
├── specs/                          # SOURCE OF TRUTH — read before coding
│   ├── 00-data-models.md
│   ├── 01-auth.md
│   ├── 02-calendar.md
│   ├── 03-quinielas.md
│   ├── 04-bet-pools.md
│   ├── 05-tokens.md
│   └── 06-admin.md
├── supabase/
│   ├── migrations/                 # 001–012: tables, RLS, functions, triggers, views
│   ├── seed/matches_wc2026.sql     # 48 group stage matches in UTC
│   └── functions/                  # Edge Functions (Deno)
│       ├── ping/                   # Anti-pause heartbeat
│       ├── sync-matches/           # football-data.org → DB upsert
│       ├── get-matches/
│       ├── post-prediction/
│       ├── get-leaderboard/
│       ├── get-bet-pools/
│       ├── post-bet-entry/         # calls place_bet() SQL function
│       ├── resolve-pool/           # calls resolve_pool() SQL function (admin)
│       ├── create-bet-pool/
│       └── admin-manage-user/
└── src/
    ├── lib/supabase.ts             # client singleton
    ├── lib/timezone.ts             # detectTimezone(), formatMatchTime()
    ├── lib/tokens.ts               # formatTokens(), balance helpers
    ├── store/                      # authStore, matchStore, betStore
    ├── types/index.ts              # ALL TypeScript types — single file
    ├── pages/                      # LoginPage, CalendarPage, QuinielasPage, BetPools, admin/*
    └── components/                 # MatchCard, PredictionForm, OddsBar, BetForm, Leaderboard, ui/*
```

## Database (Key Tables)

- **`profiles`** — extends `auth.users`; has `role`, `tokens`, `is_blocked`
- **`matches`** — WC2026 schedule; `utc_datetime` always stored in UTC
- **`predictions`** — one per user/match; immutable after creation
- **`bet_pools`** — pool lifecycle: `open → closed → resolved`
- **`bet_options`** — 2–4 options per pool; `total_tokens` updated by SQL only
- **`bet_entries`** — one per user/pool; inserted only via `place_bet()`
- **`token_transactions`** — audit log of every token movement
- **`admin_logs`** — every admin action logged

## Critical SQL Functions

- **`place_bet(user_id, option_id, amount)`** — atomic; locks user row, validates pool open + tokens sufficient, deducts tokens, inserts entry, updates option totals. All in one transaction.
- **`resolve_pool(pool_id, winning_option_id)`** — marks winner, calculates parimutuel payouts (`FLOOR(bet × pool_total / winning_total)`), credits winners, closes pool.
- **`calculate_prediction_points(match_id)`** — triggered on match finish; awards +3pts/30tk (exact), +1pt/10tk (correct outcome), 0 (wrong).

## Betting Odds (Parimutuel)

No house cut. All tokens in the pool go back to winners.

```
pool_total = SUM of all options' tokens

Winner payout = FLOOR(their_bet × pool_total / winning_option_total)
```

## Environment Variables

```bash
# Frontend (Vite — VITE_ prefix exposes to browser)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_NAME=FUBOL

# Edge Functions only — never expose to frontend
SUPABASE_SERVICE_ROLE_KEY=
FOOTBALL_API_KEY=
```

## Non-Negotiable Constraints

1. **Spec first.** Write/read `specs/` before implementing any feature.
2. **Never update `profiles.tokens` from the frontend.** Only SQL functions and the `admin-manage-user` Edge Function touch token balances.
3. **Never expose secrets to the frontend.** Service role key and football API key are Edge Function–only.
4. **All datetimes in DB are UTC.** Timezone conversion is frontend-only — never in Edge Functions or SQL.
5. **`src/types/index.ts` is the single types file.** No per-feature type files.
6. **One Edge Function per operation.**
7. **RLS is enabled on every table.** No exceptions.
8. **Tokens are integers.** `Math.floor()` on all payout division.
9. **Mobile first.** Every page must work at 375px before desktop layout.
10. **`ping` is the first Edge Function deployed.** Register on cron-job.org immediately after Supabase project creation.

## Build Order (4-Day Plan)

| Day | Focus | Done When |
|-----|-------|-----------|
| 1 | Specs + types + auth + infra setup | User can register, log in, reach protected home on live Netlify URL |
| 2 | Calendar + Quinielas + timezone + Edge Functions | User can browse calendar in local time and submit a prediction |
| 3 | Bet Pools (Apuestas) + real-time odds | User can bet, see odds update live, receive tokens on win |
| 4 | Admin Panel + QA + production hardening | All Definition of Done items checked off |

## Development Philosophy

- **Spec-Driven Development (SDD):** specs are the source of truth; code must satisfy them.
- **KISS:** flat folder structures, one file = one responsibility, no abstractions until a pattern repeats twice, critical business logic lives in SQL not the frontend.
- **Agentic Parallelism:** Architect publishes `specs/` and `types/index.ts` in Hour 1 of Day 1; DBA and Fullstack run in parallel from there.
