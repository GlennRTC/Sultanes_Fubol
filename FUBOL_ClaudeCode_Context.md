# FUBOL — Claude Code Context Document
### Handoff for Agentic Development
> Read this entire document before writing a single line of code.

---

## 1. What You Are Building

**FUBOL** is a web app built for the **FIFA World Cup 2026** that combines a match calendar, a predictions game (quinielas), and a Polymarket-style betting module — all powered by a virtual token economy, running entirely on free-tier infrastructure with no server to manage.

Users register with email and password, receive virtual tokens assigned by an admin, and use those tokens in two ways: predicting match scores (quinielas) and betting on in-game outcome pools (apuestas). The quinielas module scores predictions automatically when a match result is entered — exact score is worth more than just picking the right winner. The betting module works like Polymarket: each pool has a question with 2–4 options, odds update dynamically in real time as more users place bets, and when an admin resolves the pool the entire token pot is distributed proportionally among winners. No house cut.

Match times are automatically shown in the user's local timezone, detected from the browser, with a manual override that persists across sessions. A leaderboard ranks all users by prediction points.

Admins have a dedicated panel — protected by role — to manage users (block accounts, reset passwords, assign or remove tokens), manually enter match results, create and resolve betting pools, and view a report of token circulation and top performers.

**Tokens are virtual only.** There is no real money, no payment integration, and no monetary value attached to tokens. Admins mint and distribute them freely. The system is pure gamification.

The app is entirely free to run. The frontend is deployed on Netlify's free tier. The backend — authentication, database, and server-side logic — runs on Supabase's free tier. Supabase's free PostgreSQL instance pauses after 7 days of inactivity, which is prevented by a lightweight ping Edge Function called every 3 days by a free cron job on cron-job.org. Match data comes from football-data.org's free API tier, which includes the 2026 World Cup. No credit card is required for any part of the infrastructure.

The app has four modules:

1. **Calendario** — Full World Cup 2026 match schedule. Times displayed in the user's local timezone. Filterable by group and team.
2. **Quinielas** — Predict the score of any scheduled match. Earn points and tokens automatically when results are entered. Global leaderboard.
3. **Apuestas** — Polymarket-style prediction pools per match. Dynamic parimutuel odds. Admin creates and resolves pools. Users bet tokens before the deadline.
4. **Admin Panel** — Complete back-office: user management, match result entry, pool management, token distribution, reports.

---

## 2. Development Philosophy

### Spec-Driven Development (SDD)
- **Every feature starts as a spec file in `specs/`.** Code is written to satisfy specs — not the other way around.
- Before implementing any feature, read its spec. If the spec is missing or ambiguous, write/clarify it first.
- Specs are the source of truth. If code and spec conflict, fix the code.
- The spec files are plain Markdown. Any agent or human can read and act on them without tooling.

### KISS (Keep It Simple, Stupid)
- Flat folder structures over nested hierarchies.
- One file = one responsibility.
- No abstraction layers until a pattern repeats at least twice.
- All critical business logic lives in the database (SQL functions), not in the frontend.
- No custom auth server — Supabase Auth handles everything.

### Agentic Parallelism
- Three agents work in parallel: Architect, Fullstack Developer, DBA.
- **The Architect publishes `specs/` and `src/types/index.ts` in Hour 1 of Day 1.** Everything else unblocks from there.
- The Fullstack works with TypeScript mock types while the DBA builds the real DB. They converge when Edge Functions are ready.
- Agents do not wait for each other unless there is an explicit dependency noted in the day plan.

---

## 3. Tech Stack (100% Free Tier)

| Layer | Service | Free Tier Limits |
|-------|---------|-----------------|
| Frontend | React 18 + Vite + TypeScript on **Netlify** | 100GB bandwidth/month, unlimited deploys |
| Styling | TailwindCSS v3 | — |
| State | Zustand | — |
| Routing | React Router v6 | — |
| Auth | **Supabase Auth** | Up to 50,000 MAU |
| Database | **Supabase PostgreSQL** | 500MB storage |
| Edge Functions | **Supabase Edge Functions** (Deno) | 500,000 invocations/month |
| File Storage | **Supabase Storage** | 1GB (flag images) |
| Anti-pause cron | **cron-job.org** | Free, pings `/ping` every 3 days |
| Football Data | **football-data.org** | Free tier, WC2026 included |
| Date/Timezone | `date-fns` + `date-fns-tz` | — |
| CI/CD | Netlify auto-deploy on push to `main` | — |

**The Supabase free tier pauses inactive projects after 7 days. This is solved by:**
- A `ping` Edge Function that runs a trivial DB query and returns `200 OK`
- A free cron job on cron-job.org calling it every 3 days
- That's it. No other mitigation needed.

---

## 4. Full Project Structure

```
fubol/
│
├── specs/                          # SOURCE OF TRUTH — read before coding
│   ├── 00-data-models.md           # All DB types, enums, field constraints
│   ├── 01-auth.md                  # Registration, login, session, roles
│   ├── 02-calendar.md              # Match listing, timezone conversion rules
│   ├── 03-quinielas.md             # Prediction rules, scoring logic, leaderboard
│   ├── 04-bet-pools.md             # Pool lifecycle, odds model, resolution rules
│   ├── 05-tokens.md                # Mint, spend, earn, audit rules
│   └── 06-admin.md                 # All admin capabilities and constraints
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_matches.sql
│   │   ├── 003_predictions.sql
│   │   ├── 004_bet_pools.sql
│   │   ├── 005_bet_options.sql
│   │   ├── 006_bet_entries.sql
│   │   ├── 007_token_transactions.sql
│   │   ├── 008_admin_logs.sql
│   │   ├── 009_rls_policies.sql
│   │   ├── 010_functions.sql       # place_bet(), resolve_pool(), calc_points()
│   │   ├── 011_triggers.sql        # auto-score predictions on match finish
│   │   └── 012_views.sql           # leaderboard_view, pool_odds_view
│   │
│   ├── seed/
│   │   └── matches_wc2026.sql      # 48 group stage matches in UTC
│   │
│   └── functions/                  # Supabase Edge Functions (Deno)
│       ├── ping/index.ts           # GET /ping — anti-pause DB heartbeat
│       ├── sync-matches/index.ts   # CRON: football-data.org → upsert DB
│       ├── get-matches/index.ts    # GET /matches?date=&group=&stage=
│       ├── post-prediction/index.ts
│       ├── get-leaderboard/index.ts
│       ├── get-bet-pools/index.ts  # GET /bet-pools?match_id=&status=
│       ├── post-bet-entry/index.ts # POST → calls place_bet() SQL function
│       ├── resolve-pool/index.ts   # POST /bet-pools/:id/resolve (admin only)
│       ├── create-bet-pool/index.ts
│       └── admin-manage-user/index.ts
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                     # Router + auth guard
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client singleton
│   │   ├── timezone.ts             # detectTimezone(), formatMatchTime()
│   │   └── tokens.ts               # formatTokens(), balance helpers
│   │
│   ├── store/
│   │   ├── authStore.ts            # session, role, token balance
│   │   ├── matchStore.ts           # matches list, active filters
│   │   └── betStore.ts             # pools, user bet history
│   │
│   ├── types/
│   │   └── index.ts                # ALL TypeScript types — single file
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── CalendarPage.tsx
│   │   ├── QuinielasPage.tsx
│   │   ├── BetPoolsPage.tsx
│   │   ├── BetPoolDetailPage.tsx
│   │   └── admin/
│   │       ├── AdminLayout.tsx
│   │       ├── AdminUsersPage.tsx
│   │       ├── AdminMatchesPage.tsx
│   │       ├── AdminPoolsPage.tsx
│   │       └── AdminReportsPage.tsx
│   │
│   └── components/
│       ├── MatchCard.tsx
│       ├── PredictionForm.tsx
│       ├── OddsBar.tsx
│       ├── BetForm.tsx
│       ├── Leaderboard.tsx
│       ├── TokenBadge.tsx
│       └── ui/
│           ├── Button.tsx
│           ├── Input.tsx
│           ├── Badge.tsx
│           └── Modal.tsx
│
├── .env.example
├── netlify.toml
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 5. Database Schema (Complete)

### Enums
```sql
CREATE TYPE user_role    AS ENUM ('user', 'admin');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled');
CREATE TYPE pool_status  AS ENUM ('open', 'closed', 'resolved', 'cancelled');
CREATE TYPE pool_type    AS ENUM ('binary', 'multiple_exclusive', 'numeric_range');
```

### Tables

**`profiles`** — extends Supabase `auth.users`
```
id UUID PK (FK → auth.users)
username TEXT UNIQUE NOT NULL
display_name TEXT
role user_role DEFAULT 'user'
tokens INTEGER DEFAULT 0 CHECK >= 0
is_blocked BOOLEAN DEFAULT FALSE
created_at, updated_at TIMESTAMPTZ
```

**`matches`**
```
id UUID PK
external_id TEXT UNIQUE          -- football-data.org ID
match_number INTEGER
stage TEXT                        -- 'group','round_of_16','quarter','semi','final'
group_name TEXT                   -- 'A'..'H', null for knockouts
home_team TEXT NOT NULL
away_team TEXT NOT NULL
home_flag_url TEXT
away_flag_url TEXT
utc_datetime TIMESTAMPTZ NOT NULL -- always stored in UTC
venue TEXT, city TEXT, country TEXT
status match_status DEFAULT 'scheduled'
home_score INTEGER, away_score INTEGER
created_at TIMESTAMPTZ
```

**`predictions`**
```
id UUID PK
user_id UUID FK → profiles
match_id UUID FK → matches
predicted_home_score INTEGER NOT NULL CHECK >= 0
predicted_away_score INTEGER NOT NULL CHECK >= 0
tokens_wagered INTEGER NOT NULL DEFAULT 10 CHECK > 0
points_earned INTEGER DEFAULT 0
tokens_earned INTEGER DEFAULT 0
created_at TIMESTAMPTZ
UNIQUE(user_id, match_id)
```

**`bet_pools`**
```
id UUID PK
match_id UUID FK → matches
created_by UUID FK → profiles (admin)
pool_type pool_type NOT NULL
question TEXT NOT NULL
description TEXT
deadline TIMESTAMPTZ NOT NULL    -- last moment to place a bet
status pool_status DEFAULT 'open'
resolved_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

**`bet_options`**
```
id UUID PK
pool_id UUID FK → bet_pools CASCADE DELETE
label TEXT NOT NULL               -- e.g. "Sí", "No", "0-1 goles"
total_tokens INTEGER DEFAULT 0   -- running sum of bets on this option
is_winner BOOLEAN DEFAULT FALSE
display_order INTEGER DEFAULT 0
```

**`bet_entries`**
```
id UUID PK
user_id UUID FK → profiles
option_id UUID FK → bet_options
pool_id UUID FK → bet_pools      -- denormalized for fast queries
tokens_amount INTEGER NOT NULL CHECK > 0
tokens_won INTEGER DEFAULT 0
created_at TIMESTAMPTZ
UNIQUE(user_id, pool_id)         -- one bet per pool per user
```

**`token_transactions`**
```
id UUID PK
user_id UUID FK → profiles
admin_id UUID FK → profiles (nullable)
amount INTEGER NOT NULL           -- positive = credit, negative = debit
reason TEXT                       -- 'admin_grant','prediction_win','bet_win','bet_placed','prediction_placed'
reference_id UUID (nullable)      -- FK to bet_entry or prediction
created_at TIMESTAMPTZ
```

**`admin_logs`**
```
id UUID PK
admin_id UUID FK → profiles
action TEXT NOT NULL
target_type TEXT                  -- 'user','match','pool'
target_id UUID
details JSONB
created_at TIMESTAMPTZ
```

---

## 6. Critical SQL Functions

### `place_bet(p_user_id, p_option_id, p_amount)` — atomic, race-condition safe
```
1. Lock user row with SELECT FOR UPDATE
2. Validate pool is 'open' and deadline not passed
3. Validate user has enough tokens
4. Deduct tokens from profiles.tokens
5. INSERT bet_entry
6. UPDATE bet_options.total_tokens += amount
7. INSERT token_transaction (negative amount, reason='bet_placed')
8. RETURN bet_entry
All steps in a single transaction. RAISE EXCEPTION on any failure.
```

### `resolve_pool(p_pool_id, p_winning_option_id)` — called by admin Edge Function
```
1. Validate pool status = 'open' or 'closed'
2. Mark winning option: is_winner = TRUE
3. Calculate pool_total = SUM of all bet_options.total_tokens
4. For each bet_entry on the winning option:
   tokens_won = FLOOR(entry.tokens_amount × (pool_total / winning_option.total_tokens))
5. Credit tokens_won to each winner's profiles.tokens
6. INSERT token_transaction for each winner (reason='bet_win')
7. SET pool status = 'resolved', resolved_at = NOW()
```

### `calculate_prediction_points(p_match_id)` — called by trigger on match finish
```
Scoring rules:
  Exact score match:                    +3 points, +30 tokens
  Correct winner/draw, wrong score:     +1 point,  +10 tokens
  Wrong prediction:                      0 points,   0 tokens

For each prediction on this match:
  1. Calculate points and tokens_earned
  2. UPDATE prediction.points_earned and tokens_earned
  3. UPDATE profiles.tokens += tokens_earned
  4. INSERT token_transaction (reason='prediction_win')
```

---

## 7. RLS Policies (Key Rules)

```
profiles:
  SELECT — user sees own row; admin sees all
  UPDATE — user updates own row (username, display_name only); admin updates any
  tokens column — NEVER directly updatable from frontend (only via SQL functions)

matches:
  SELECT — public (all authenticated users)
  INSERT/UPDATE — admin only

predictions:
  SELECT — user sees own; admin sees all
  INSERT — authenticated user, only if match.status = 'scheduled', user not blocked
  UPDATE/DELETE — none (predictions are immutable after creation)

bet_pools:
  SELECT — public (all authenticated users)
  INSERT/UPDATE — admin only

bet_options:
  SELECT — public
  INSERT/UPDATE — admin only (total_tokens updated only via place_bet() function)

bet_entries:
  SELECT — user sees own; admin sees all
  INSERT — only via place_bet() SQL function (SECURITY DEFINER), never direct
  UPDATE/DELETE — none

token_transactions:
  SELECT — user sees own; admin sees all
  INSERT — only via SQL functions (SECURITY DEFINER), never direct from frontend

admin_logs:
  SELECT/INSERT — admin only
```

---

## 8. Edge Functions Contract

All Edge Functions validate the Supabase JWT. Admin-only functions check `profiles.role = 'admin'`.

### `GET /ping`
```
Returns: { ok: true, timestamp }
Auth: none (public — called by cron-job.org)
Purpose: Prevents Supabase free tier from pausing the project.
         Runs a trivial SELECT 1 query to keep the DB connection alive.
```

### `GET /matches`
```
Query params: date (YYYY-MM-DD), group (A-H), stage, status
Returns: Match[]
Auth: required
```

### `POST /predictions`
```
Body: { match_id, predicted_home_score, predicted_away_score, tokens_wagered }
Validates: match.status = 'scheduled', user has enough tokens, no duplicate
Returns: Prediction
Auth: required, user not blocked
```

### `GET /leaderboard`
```
Query params: limit (default 20), offset
Returns: { rank, username, display_name, total_points, predictions_count }[]
Auth: required
```

### `GET /bet-pools`
```
Query params: match_id, status (open|closed|resolved)
Returns: BetPool[] with options and current odds
Auth: required
```

### `POST /bet-entries`
```
Body: { option_id, tokens_amount }
Calls: place_bet() SQL function
Returns: BetEntry
Auth: required, user not blocked
```

### `POST /bet-pools/:id/resolve`
```
Body: { winning_option_id }
Calls: resolve_pool() SQL function
Returns: { resolved: true, winners_count, tokens_distributed }
Auth: admin only
```

### `POST /bet-pools` (create)
```
Body: { match_id, pool_type, question, description, deadline, options: {label, display_order}[] }
Returns: BetPool with options
Auth: admin only
```

### `POST /admin/users/:id/action`
```
Body: { action: 'block'|'unblock'|'delete'|'add_tokens'|'reset_password', amount?: number }
Returns: { success: true }
Auth: admin only
Logs: every action to admin_logs
```

---

## 9. Timezone Handling Rules

- **All datetimes stored in UTC** in the database. No exceptions.
- **Conversion happens only in the frontend** — never in Edge Functions or SQL.
- Detection order:
  1. `Intl.DateTimeFormat().resolvedOptions().timeZone` (browser native)
  2. User's manual selection (persisted in `localStorage` as `fubol_timezone`)
  3. Fallback: `'America/New_York'`
- Use `date-fns-tz` `formatInTimeZone()` for all display formatting.
- Always show timezone abbreviation next to the time (e.g. "3:00 PM COT").

---

## 10. Token Economy Rules

- Tokens are **integers only** — no decimals, no fractions. Use `Math.floor()` on all division.
- `profiles.tokens` has a `CHECK (tokens >= 0)` constraint — balance can never go negative.
- Only admins can mint tokens (via `admin-manage-user` Edge Function).
- The frontend **never directly updates** `profiles.tokens` — only SQL functions may do this.
- Every token movement, without exception, creates a `token_transactions` record.

Token flow:
```
Admin mints         → user.tokens +N                          (admin_grant)
User predicts       → user.tokens -10 (or chosen amount)      (prediction_placed)
User bets           → user.tokens -amount via place_bet()      (bet_placed)
Match finishes      → user.tokens +0/10/30 via trigger         (prediction_win)
Pool resolved       → user.tokens +tokens_won via resolve_pool (bet_win)
```

---

## 11. Betting Odds Model (Parimutuel)

Dynamic odds — no fixed house. All tokens in the pool are redistributed to winners. Think horse racing, not a sportsbook.

```
pool_total = SUM of tokens across ALL options

If option X wins:
  Each winner receives: FLOOR(their_tokens × (pool_total / option_X.total_tokens))

Example:
  Pool: "¿Habrá gol en el primer tiempo?"
  - Sí:  400 tokens
  - No:  100 tokens
  pool_total = 500

  "Sí" wins:
    User A bet 100 → wins FLOOR(100 × 500/400) = 125 tokens
    User B bet 50  → wins FLOOR(50  × 500/400) = 62 tokens

  "No" wins:
    User C bet 100 → wins FLOOR(100 × 500/100) = 500 tokens
```

The `pool_odds_view` recalculates percentages live as bets come in and is the source for the OddsBar component.

---

## 12. MVP Pool Types

Admin can only create these three types. No custom types in MVP.

| Type | Description | Example |
|------|-------------|---------|
| `binary` | Yes/No question | ¿Habrá gol en el primer tiempo? |
| `multiple_exclusive` | Pick one winner | ¿Quién ganará? Team A / Team B / Empate |
| `numeric_range` | Numeric buckets | ¿Cuántos goles? 0-1 / 2-3 / 4+ |

Pool deadline options:
- **Pre-match** — closes at `match.utc_datetime`
- **Half-time** — admin sets a manual datetime (MVP; automation is post-MVP)

---

## 13. Day-by-Day Build Order

### Day 1 — Infrastructure + Auth
```
Hour 1 (Architect — blocks everything else):
  → Write specs/00 through specs/06
  → Write src/types/index.ts (all TS types derived from specs/00)

Parallel after Hour 1:

  DBA:
    → Create Supabase project
    → migrations 001–009 (all tables + RLS policies)
    → seed/matches_wc2026.sql (48 matches, UTC datetimes)
    → Create Netlify project, link repo, set env vars

  Fullstack:
    → npm create vite@latest fubol -- --template react-ts
    → Install: tailwindcss, @supabase/supabase-js, zustand, react-router-dom, date-fns, date-fns-tz
    → App.tsx: router setup + auth guard (using mock types until DB ready)
    → LoginPage, RegisterPage, ForgotPasswordPage
    → lib/supabase.ts (client singleton), authStore.ts
    → Initial deploy to Netlify (even if just the login screen)
```
**Day 1 done when:** User can register, log in, and reach a protected home screen on the live Netlify URL.

---

### Day 2 — Calendar + Quinielas
```
Parallel:

  Architect:
    → sync-matches Edge Function (football-data.org → upsert)
    → get-matches Edge Function
    → post-prediction Edge Function
    → get-leaderboard Edge Function

  DBA:
    → migrations 010 (SQL functions), 011 (triggers), 012 (views)
    → Indexes: matches(utc_datetime), matches(status),
               predictions(user_id), predictions(match_id)

  Fullstack:
    → lib/timezone.ts: detectTimezone(), formatMatchTime()
    → lib/tokens.ts: formatTokens()
    → CalendarPage: MatchCard, date navigation, group filter, timezone selector
    → QuinielasPage: PredictionForm, Leaderboard, TokenBadge
    → matchStore.ts
```
**Day 2 done when:** User can browse the calendar in local time and submit a prediction.

---

### Day 3 — Bet Pools (Polymarket Module)
```
Parallel:

  Architect:
    → get-bet-pools Edge Function
    → post-bet-entry Edge Function (calls place_bet())
    → resolve-pool Edge Function (calls resolve_pool())
    → create-bet-pool Edge Function

  DBA:
    → Verify place_bet() and resolve_pool() correctness
    → Verify pool_odds_view recalculates accurately
    → Enable Supabase Realtime on bet_options table
    → Performance check on bet-related queries

  Fullstack:
    → BetPoolsPage: hub, list of pools grouped by match
    → BetPoolDetailPage: OddsBar (live %), BetForm, pool status badge
    → betStore.ts
    → Toast on pool resolution (user won/lost)
```
**Day 3 done when:** User can browse pools, bet tokens, see odds update live, and receive tokens on win.

---

### Day 4 — Admin Panel + QA + Deploy
```
Parallel:

  Architect:
    → RLS security audit (verify no cross-user data exposure)
    → End-to-end token flow verification
    → ping Edge Function (anti-pause heartbeat)
    → Operations runbook

  DBA:
    → Confirm admin_logs is writing on every admin action
    → Enable Supabase daily backups
    → Final index review
    → Production env vars confirmed in Netlify

  Fullstack:
    → AdminUsersPage: search, block/unblock, tokens, reset password
    → AdminMatchesPage: enter result, change match status
    → AdminPoolsPage: create pool, resolve pool, view distribution
    → AdminReportsPage: token circulation, top predictors
    → Full mobile responsive QA (375px viewport)
    → E2E smoke test: register → predict → bet → admin resolves → tokens received
```
**Day 4 done when:** All items in the Definition of Done are checked off.

---

## 14. Definition of Done

### Auth
- [ ] Register with username + email + password
- [ ] Login and logout
- [ ] Forgot password → reset via email link
- [ ] Blocked users cannot log in

### Calendar
- [ ] 48 group stage matches visible
- [ ] Times shown in user's local timezone
- [ ] Manual timezone selector persists across sessions
- [ ] Filter by group and by team

### Quinielas
- [ ] User can predict score for any scheduled match
- [ ] Cannot predict a match that has already started or finished
- [ ] Tokens deducted immediately on prediction submission
- [ ] Points and tokens auto-credited when admin enters result
- [ ] Leaderboard shows correct ranking

### Bet Pools
- [ ] Admin can create a pool with 2–4 options
- [ ] All users can see open pools and live odds
- [ ] User can bet tokens before the deadline
- [ ] Bet rejected at DB level if tokens are insufficient
- [ ] Duplicate bet on same pool rejected (UNIQUE constraint)
- [ ] Admin resolves pool → tokens distributed correctly to winners
- [ ] User bet history shows win/loss and tokens won

### Tokens
- [ ] Admin can add tokens to any user
- [ ] Every token movement has a corresponding token_transaction record
- [ ] Token balance never drops below 0

### Admin Panel
- [ ] List and search all users
- [ ] Block / unblock user
- [ ] Reset user password
- [ ] Add / remove tokens from user
- [ ] Enter match result manually
- [ ] Create bet pool with options and deadline
- [ ] Resolve bet pool
- [ ] View report: token circulation + top predictors

### Infrastructure
- [ ] Live on Netlify with public URL
- [ ] No unauthenticated access to protected routes
- [ ] No cross-user data exposure (RLS verified)
- [ ] Mobile responsive (iOS Safari + Android Chrome, 375px+)
- [ ] Supabase backups enabled
- [ ] Ping cron configured on cron-job.org

---

## 15. Environment Variables

```bash
# .env.example

# Frontend — exposed to browser via Vite (VITE_ prefix required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=FUBOL

# Supabase Edge Functions only — NEVER expose these to the frontend
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FOOTBALL_API_KEY=your-football-data-org-key
```

---

## 16. Netlify Configuration

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "20"
```

---

## 17. Non-Negotiable Constraints

1. **Write the spec first.** If a spec file does not exist for a feature, create it before writing any implementation code.
2. **Never update `profiles.tokens` from the frontend.** Only `place_bet()`, `resolve_pool()`, `calculate_prediction_points()`, and the `admin-manage-user` Edge Function may modify token balances.
3. **Never expose secrets to the frontend.** `SUPABASE_SERVICE_ROLE_KEY` and `FOOTBALL_API_KEY` are Edge Function–only environment variables.
4. **All datetimes in the DB are UTC.** Timezone conversion is a frontend-only responsibility. Edge Functions never convert timezones.
5. **`src/types/index.ts` is the single types file.** Do not create per-feature type files.
6. **One Edge Function per operation.** Do not bundle unrelated operations into a single function.
7. **RLS is enabled on every table.** No `ALTER TABLE x DISABLE ROW LEVEL SECURITY` under any circumstances.
8. **Tokens are integers.** Apply `Math.floor()` to all division in payout calculations.
9. **No new dependencies without justification.** The stack is defined. If adding a library, explain why in a comment at the top of the file that uses it.
10. **Mobile first.** Every page must be functional and usable on a 375px viewport before any desktop layout work begins.
11. **The `ping` function must be the first Edge Function deployed.** Register it on cron-job.org immediately after the Supabase project is created to prevent any pause risk.

---

*FUBOL — Claude Code Context Document v2.0*
*Free-tier infrastructure edition — Supabase + Netlify + cron-job.org*
*Generated from: PO validation + Work Plan v2.0 + SDD Project Structure + Free Stack Decision*
