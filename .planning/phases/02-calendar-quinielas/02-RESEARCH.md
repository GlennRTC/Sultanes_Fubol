# Phase 2: Calendar + Quinielas — Research

**Researched:** 2026-06-05
**Domain:** React/Supabase match calendar with score predictions and leaderboard
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Calendar Layout (CalendarPage `/calendario`)**
- D-01: Two views with toggle — "Por fecha" (date-grouped scrollable list) and "Por grupo" (tabbed A–H, each tab showing that group's 6 matches).
- D-02: Match card content: home team vs away team, match time in user's local timezone, status badge (Programado / En vivo / Finalizado), actual score if finished.
- D-03: In "Por fecha" view, two dropdowns at the top — "Grupo:" and "Equipo:". Each has a "Todos" option to reset.
- D-04: Match seed data is the real FIFA WC 2026 group-stage schedule, built as `supabase/seed/matches_wc2026.sql`.

**Prediction UX**
- D-05: Clicking any match card opens a prediction modal (no page navigation).
- D-06: Modal contains match header, two number inputs, token cost reminder ("Costo: 20 fichas"), and "Confirmar predicción" button. Already-submitted predictions shown read-only.
- D-07: Two-step confirmation before final commit with copy "¿Estás seguro? Esta predicción no se puede cambiar. Se descontarán 20 fichas."
- D-08: On success: modal closes, match card shows prediction badge ("Tu predicción: 2-1"), Navbar token balance updates from Zustand.
- D-09: Locked matches (live/finished): modal opens read-only with user's prediction or "Este partido ya comenzó — no se aceptan predicciones."

**Token Economics**
- D-10: Each prediction costs 20 tokens via `place_prediction` SQL function.
- D-11: Payout: exact score = 3 pts + 30 tokens; correct winner/draw = 1 pt + 10 tokens; wrong = 0. Computed by `calculate_prediction_points`.
- D-12: Predictions locked after first submission — no updates, no refunds.
- D-13: Default initial token balance for testing Phase 2: 500 tokens.

**Timezone Preference**
- D-14: Auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone` on page load.
- D-15: User-selected timezone saved to `localStorage` key `fubol_timezone`. No DB column.
- D-16: Picker offers 15 options: México (Centro), México (Pacífico), México (Cancún), Colombia, Perú, Ecuador, Venezuela, Bolivia, Chile, Argentina/Uruguay, Paraguay, Cuba, España (Península), España (Canarias), UTC.

**Navbar & Routing Updates**
- D-17: Navbar gains two nav links: "Calendario" → `/calendario` and "Tabla" → `/tabla`.
- D-18: `/bienvenido` and `/` both redirect to `/calendario`. `HomePage` component removed.
- D-19: Authenticated users navigating to `/login` or `/registro` redirected to `/calendario`.

**Phase 2 Scoring / Admin Access**
- D-20: `calculate_prediction_points` is a PostgreSQL function callable via Supabase RPC from admin context. Admin UI ships in Phase 4; Phase 2 testing done via Supabase dashboard.

### Claude's Discretion
- DB schema details beyond columns named above (indexes, additional constraints, trigger definitions).
- `place_prediction` function internals (parameter names, exception handling, return type).
- Leaderboard query design (ranking by points, tie-breaking logic).
- Match card component structure and CSS beyond Phase 1 patterns.
- The exact list of 15 timezone options (Claude fills out from Latin America + Spain constraint).
- Supabase RLS policy definitions for `matches` and `predictions` tables.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAL-01 | All 48 group stage matches are visible | DB `matches` table + Supabase `from('matches').select()` query; seed SQL with all 72 group-stage fixtures |
| CAL-02 | Match times shown in user's local timezone (auto-detected, manual override persists) | `date-fns-tz` v3 `formatInTimeZone()` verified; `Intl.DateTimeFormat` auto-detection verified; localStorage persistence pattern |
| CAL-03 | Matches filterable by group and by team | Client-side filter on fetched matches array using group_name and team name; native `<select>` elements |
| CAL-04 | Match status (scheduled / live / finished) is visible on each match card | `status` column in `matches` table; status badge component with three states |
| QUI-01 | User can predict the exact score for any scheduled match | Prediction modal with two number inputs; `place_prediction` SQL function via Supabase RPC |
| QUI-02 | Prediction blocked once match has started or finished | Frontend check on `match.status !== 'scheduled'`; backend enforced in `place_prediction` SQL function |
| QUI-03 | Tokens deducted immediately on prediction submission | `place_prediction` does atomic `UPDATE profiles SET tokens = tokens - 20` + `INSERT INTO predictions` in single transaction |
| QUI-04 | Points and tokens auto-credited when admin enters result | `calculate_prediction_points(match_id, home_score, away_score)` SQL function updates all predictions for that match |
| QUI-05 | Global leaderboard ranks all users by total prediction points | Supabase query on `profiles` joined/queried with aggregated prediction points; `/tabla` page |
</phase_requirements>

---

## Summary

Phase 2 is a pure frontend + DB layer build. No new npm packages are installed — the locked stack (date-fns-tz v3, @supabase/supabase-js v2, Zustand v5, React Router v6) covers all needs. The two biggest technical concerns are: (1) correctly using the date-fns-tz v3 API, which renamed functions from v2 (`utcToZonedTime` → `toZonedTime`) and (2) writing the two SQL functions (`place_prediction`, `calculate_prediction_points`) as proper `SECURITY DEFINER` functions so they can bypass RLS and update multiple users' `profiles.tokens` atomically.

**Critical count correction:** The REQUIREMENTS.md and CONTEXT.md reference "48 group-stage matches" — this refers to the 48 *teams*, not the match count. WC 2026 has 12 groups of 4 teams = **72 group-stage matches**. [VERIFIED: ESPN official schedule]. The seed file `supabase/seed/matches_wc2026.sql` must contain all 72 matches. The UI spec says "Por grupo" shows each group's matches (6 per group, A–L) which is consistent with 72 total. Planning must use 72.

The leaderboard is a simple ranked read — no real-time subscription is needed (only updates when admin runs `calculate_prediction_points` via the dashboard). Fetch-on-mount is sufficient for Phase 2.

**Primary recommendation:** Build all three backend objects (migration with `matches` + `predictions` tables, `place_prediction` SQL function, `calculate_prediction_points` SQL function) in Wave 1, then the frontend in Wave 2, so Wave 2 developers always have a working DB to test against.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Match data persistence | Database (Supabase PostgreSQL) | — | Static data seeded from SQL; no server needed |
| Timezone conversion | Browser / Client (frontend) | — | Explicitly decided: UTC stored, conversion is frontend-only |
| Match filtering by group/team | Browser / Client (frontend) | — | Client-side filter on already-fetched array; 72 rows is tiny |
| Prediction submission / token deduction | Database (SQL function) | API (Supabase RPC) | Atomic transaction required; frontend calls `supabase.rpc()` only |
| Prediction scoring / payout | Database (SQL function) | — | Must update many rows atomically; admin-triggered via dashboard |
| Leaderboard rendering | Browser / Client (frontend) | Database | Simple ranked query; no edge function needed |
| Timezone preference persistence | Browser (localStorage) | — | D-15: no DB column; localStorage key `fubol_timezone` |
| Match status enforcement (lock predictions) | Database (SQL function) + Frontend | — | Frontend disables UI; SQL function validates as second gate |
| Auth guard | Frontend (ProtectedRoute) | Supabase Auth | Existing Phase 1 pattern; no changes needed |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Installed Version | Purpose | Why Standard |
|---------|------------------|---------|--------------|
| date-fns | 4.4.0 [VERIFIED: npm registry] | Date formatting utilities (`format`, `startOfDay`, grouping) | Companion to date-fns-tz; already in package.json |
| date-fns-tz | 3.2.0 [VERIFIED: npm registry] | Timezone-aware date formatting (`formatInTimeZone`, `toZonedTime`) | Only package in stack for IANA timezone conversion |
| @supabase/supabase-js | 2.107.0 [VERIFIED: npm registry] | DB queries, RPC calls | Singleton client already established in Phase 1 |
| zustand | 5.0.14 [VERIFIED: npm registry] | Global state (auth + token balance) | Phase 1 pattern; extend for matches/predictions if needed |
| react-router-dom | 7.17.0 [VERIFIED: npm registry] | Routing, NavLink active state detection | Phase 1 pattern |

**No new npm packages are needed or permitted.** Stack is locked per CLAUDE.md.

### date-fns-tz v3 Breaking Change Warning

date-fns-tz v3 renamed its core functions. **Training data and online examples frequently use the v2 API.** The installed version is v3.

| v2 (WRONG — will throw) | v3 (CORRECT — installed) |
|------------------------|--------------------------|
| `utcToZonedTime(date, tz)` | `toZonedTime(date, tz)` |
| `zonedTimeToUtc(date, tz)` | `fromZonedTime(date, tz)` |
| `format(date, pattern, { timeZone })` | Same — unchanged |
| `formatInTimeZone(date, tz, pattern)` | Same — unchanged |

**Preferred pattern** for match time display (verified against installed v3.2.0):
```typescript
// Source: verified by running against installed node_modules/date-fns-tz v3.2.0
import { formatInTimeZone } from 'date-fns-tz';

// Convert UTC match time to user's timezone for display
// matchDatetime: ISO string from DB (e.g., "2026-06-11T19:00:00+00:00")
// userTimezone: IANA name from localStorage (e.g., "America/Mexico_City")
const displayTime = formatInTimeZone(
  new Date(match.match_datetime),
  userTimezone,
  'd MMM · HH:mm zzz'
);
// Result: "11 Jun · 14:00 CST"
```

**For "Por fecha" grouping** — group by local date (not UTC date):
```typescript
// Source: verified by running against installed node_modules/date-fns-tz v3.2.0
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

// Get the local date string for grouping
const zonedDate = toZonedTime(new Date(match.match_datetime), userTimezone);
const dateKey = format(zonedDate, 'yyyy-MM-dd');
// Use dateKey as Map key for grouping — matches crossing midnight in UTC
// correctly land in the right local day
```

> **Pitfall:** Grouping by UTC date `match.match_datetime.substring(0, 10)` is WRONG for non-UTC users. A match at 2026-06-12T02:00:00Z shows as "June 11" in Mexico City time. Always group by local date.

### Package Legitimacy Audit

No new packages are installed in this phase. The following packages from the locked stack are verified:

| Package | Registry | slopcheck | Disposition |
|---------|----------|-----------|-------------|
| date-fns | npm | [OK] | Approved — already installed |
| date-fns-tz | npm | [OK] | Approved — already installed |
| @supabase/supabase-js | npm | [OK] | Approved — already installed |
| zustand | npm | [OK] | Approved — already installed |
| react-router-dom | npm | [OK] | Approved — already installed |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User browser
  │
  ├─[page load]──► CalendarPage
  │                  │
  │                  ├─ reads localStorage('fubol_timezone')
  │                  │    └─ fallback: Intl.DateTimeFormat().resolvedOptions().timeZone
  │                  │
  │                  ├─ supabase.from('matches').select('*')
  │                  │    └─ returns 72 matches (UTC datetimes)
  │                  │
  │                  ├─ client-side convert UTC → local timezone (date-fns-tz)
  │                  ├─ client-side filter by group / team
  │                  ├─ render: "Por fecha" (date-grouped) or "Por grupo" (tabs A–L)
  │                  │
  │                  └─[card click]──► PredictionModal
  │                                     │
  │                                     ├─ show existing prediction (read-only)
  │                                     │   OR score inputs + confirm flow
  │                                     │
  │                                     └─[confirm]──► supabase.rpc('place_prediction', {
  │                                                       p_match_id, p_home, p_away })
  │                                                        │
  │                                                        └─ PostgreSQL (SECURITY DEFINER)
  │                                                             ├─ CHECK match.status = 'scheduled'
  │                                                             ├─ CHECK profile.tokens >= 20
  │                                                             ├─ INSERT predictions row
  │                                                             └─ UPDATE profiles SET tokens = tokens - 20
  │                                                             (atomic — single transaction)
  │
  ├─[/tabla]──────► LeaderboardPage
  │                  └─ supabase.from('profiles').select('username, tokens')
  │                       + aggregate points from predictions
  │                       └─ render ranked table
  │
Admin (Phase 4)
  └─[dashboard or future admin UI]
       └─ supabase.rpc('calculate_prediction_points', {
            p_match_id, p_home_score, p_away_score })
              └─ PostgreSQL (SECURITY DEFINER)
                   ├─ UPDATE matches SET status='finished', home_score=X, away_score=Y
                   └─ FOR EACH prediction on this match:
                        ├─ compute points + token_credit based on scoring rules
                        ├─ UPDATE predictions SET points_earned, tokens_wagered_return
                        └─ UPDATE profiles SET tokens = tokens + token_credit
```

### Recommended Project Structure

```
src/
├── components/
│   ├── Navbar.tsx            # EXTEND: add nav links (existing)
│   ├── FullScreenSpinner.tsx # REUSE unchanged
│   ├── ProtectedRoute.tsx    # REUSE unchanged
│   ├── MatchCard.tsx         # NEW: match card component
│   ├── PredictionModal.tsx   # NEW: prediction modal with two-step confirm
│   └── TimezonePicker.tsx    # NEW: minimal overlay timezone selector
├── pages/
│   ├── CalendarPage.tsx      # NEW: /calendario
│   └── LeaderboardPage.tsx   # NEW: /tabla
├── store/
│   ├── authStore.ts          # EXTEND: updateTokens action for post-prediction balance update
│   └── matchStore.ts         # NEW (optional): cache matches to avoid re-fetch on tab switch
├── types/
│   └── index.ts              # EXTEND: add Match, Prediction, LeaderboardEntry types
├── lib/
│   └── supabase.ts           # REUSE unchanged
└── App.tsx                   # EXTEND: add /calendario, /tabla routes; update redirects

supabase/
├── migrations/
│   ├── 0001_profiles.sql     # existing
│   └── 0002_matches_predictions.sql  # NEW: both tables + RLS + indexes
├── seed/
│   └── matches_wc2026.sql    # NEW: all 72 WC2026 group-stage matches
└── functions/
    └── ping/                 # REUSE unchanged
```

### Pattern 1: Supabase RPC Call for Atomic Operations

All token mutations go through `supabase.rpc()`, never direct table writes.

```typescript
// Source: verified against supabase.com/docs/reference/javascript/rpc
const { data, error } = await supabase.rpc('place_prediction', {
  p_match_id: matchId,
  p_home_score: homeScore,
  p_away_score: awayScore,
});
if (error) {
  // Map error codes to Spanish messages
  if (error.message.includes('insufficient_tokens')) {
    setError('No tienes suficientes fichas para hacer esta predicción.');
  } else if (error.message.includes('match_not_scheduled')) {
    setError('Este partido ya comenzó — no se aceptan predicciones.');
  } else {
    setError('No se pudo guardar tu predicción. Intenta de nuevo.');
  }
}
```

### Pattern 2: PostgreSQL SECURITY DEFINER Function (place_prediction)

```sql
-- Source: verified against supabase.com/docs/guides/database/functions
-- and supabase.com/docs/guides/database/postgres/row-level-security
create or replace function public.place_prediction(
  p_match_id  uuid,
  p_home_score integer,
  p_away_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_match_status text;
  v_user_tokens integer;
begin
  -- Validate match is still schedulable
  select status into v_match_status from matches where id = p_match_id;
  if v_match_status <> 'scheduled' then
    raise exception 'match_not_scheduled';
  end if;

  -- Validate sufficient tokens (belt-and-suspenders; CHECK constraint catches the rest)
  select tokens into v_user_tokens from profiles where id = v_user_id;
  if v_user_tokens < 20 then
    raise exception 'insufficient_tokens';
  end if;

  -- Atomic: deduct tokens + insert prediction
  update profiles set tokens = tokens - 20 where id = v_user_id;
  insert into predictions (user_id, match_id, home_score_prediction, away_score_prediction, tokens_wagered)
  values (v_user_id, p_match_id, p_home_score, p_away_score, 20);
end;
$$;

-- Grant execute to authenticated users only
revoke execute on function public.place_prediction from public, anon;
grant execute on function public.place_prediction to authenticated;
```

### Pattern 3: calculate_prediction_points Function

```sql
-- Source: derived from CONTEXT.md D-11 scoring rules + Supabase SECURITY DEFINER pattern
create or replace function public.calculate_prediction_points(
  p_match_id   uuid,
  p_home_score integer,
  p_away_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pred record;
  v_points integer;
  v_tokens integer;
begin
  -- Update the match result first
  update matches
  set status = 'finished',
      home_score = p_home_score,
      away_score = p_away_score
  where id = p_match_id;

  -- Score each prediction for this match
  for v_pred in
    select id, user_id, home_score_prediction, away_score_prediction
    from predictions
    where match_id = p_match_id and points_earned is null
  loop
    if v_pred.home_score_prediction = p_home_score and
       v_pred.away_score_prediction = p_away_score then
      -- Exact score
      v_points := 3;
      v_tokens := 30;
    elsif
      (v_pred.home_score_prediction > v_pred.away_score_prediction and p_home_score > p_away_score) or
      (v_pred.home_score_prediction < v_pred.away_score_prediction and p_home_score < p_away_score) or
      (v_pred.home_score_prediction = v_pred.away_score_prediction and p_home_score = p_away_score) then
      -- Correct winner or draw
      v_points := 1;
      v_tokens := 10;
    else
      v_points := 0;
      v_tokens := 0;
    end if;

    update predictions
    set points_earned = v_points,
        tokens_awarded = v_tokens
    where id = v_pred.id;

    if v_tokens > 0 then
      update profiles
      set tokens = tokens + v_tokens
      where id = v_pred.user_id;
    end if;
  end loop;
end;
$$;

-- Only callable from admin context (service role) — no authenticated grant
revoke execute on function public.calculate_prediction_points from public, anon, authenticated;
```

> **Note on calculate_prediction_points security:** This function has no `grant to authenticated` — it is only callable by service role (Supabase dashboard, or future admin Edge Function). This prevents any user from triggering payouts. [VERIFIED: Supabase RLS docs pattern]

### Pattern 4: Leaderboard Query

The leaderboard needs to show username + total prediction points + current token balance, ranked by points. Since points are stored on the `predictions` table as `points_earned`, the query aggregates:

```typescript
// Source: [ASSUMED] — Supabase query builder pattern based on schema design
// Two options depending on schema design chosen:

// Option A: If leaderboard_points column added to profiles (denormalized — simpler query)
const { data } = await supabase
  .from('profiles')
  .select('username, tokens, leaderboard_points')
  .order('leaderboard_points', { ascending: false })
  .limit(100);

// Option B: Aggregate from predictions table (normalized — more complex query)
// Requires a DB view or RPC for aggregation
// Recommended: create a leaderboard view in the migration
```

**Recommendation (Claude's Discretion):** Add a `leaderboard_points` integer column to `profiles` (default 0). `calculate_prediction_points` updates it alongside `tokens`. This avoids a GROUP BY aggregate query and simplifies RLS — the profiles RLS SELECT policy already exists. A view or RPC is more complex to RLS-protect for cross-user reads.

**Alternatively:** Create a Postgres view `leaderboard_view` that aggregates from `predictions`, with a SELECT policy allowing all authenticated users to read it. This keeps profiles normalized but adds migration complexity. Either approach works; the planner should choose one.

### Pattern 5: Zustand Store Extension for Token Balance

After a successful `place_prediction` RPC call, the Zustand store must reflect the deducted tokens immediately (D-08):

```typescript
// Source: established Phase 1 pattern in src/store/authStore.ts
// Add to existing AuthState interface:
updateTokens: (delta: number) => void;

// Implementation:
updateTokens: (delta) => set((state) => ({
  profile: state.profile ? { ...state.profile, tokens: state.profile.tokens + delta } : null,
})),

// Usage after successful place_prediction:
useAuthStore.getState().updateTokens(-20);
```

### Anti-Patterns to Avoid

- **Calling `supabase.from('predictions').insert()` directly from the frontend.** This bypasses the atomic token deduction. Always use `supabase.rpc('place_prediction', ...)`. [VERIFIED: CLAUDE.md security constraint]
- **Using `utcToZonedTime` from date-fns-tz.** This is the v2 API — it does not exist in the installed v3.2.0. [VERIFIED: inspected node_modules]
- **Grouping matches by UTC date string.** Produces wrong date headers for users in timezones where late UTC matches fall on the previous local day (e.g., 2026-06-12T02:00:00Z = June 11 in Mexico City). [VERIFIED: tested with installed date-fns-tz v3]
- **Fetching predictions and matches in separate components without coordination.** The CalendarPage needs both to render prediction badges on cards. Fetch both at page level and pass down as props.
- **Using `security invoker` for `place_prediction`.** The function must read the caller's token balance and update it — `security invoker` is fine for this since the RLS policies allow users to SELECT/UPDATE their own profile row. However, `calculate_prediction_points` MUST be `security definer` to update multiple users' profiles rows without RLS blocking cross-user updates.
- **Putting the PredictionModal in a separate route.** D-05 explicitly requires no page navigation — the calendar stays in context. Use a React portal or conditional render in CalendarPage.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone conversion | Custom UTC offset math | `date-fns-tz` `formatInTimeZone()` | DST transitions, edge cases at midnight |
| Atomic token deduction | Frontend read-then-write sequence | `place_prediction` SQL function | Race condition: two tabs could both read 20 tokens and both succeed |
| Cross-user profile updates (scoring) | Frontend RPC loop per prediction | `calculate_prediction_points` SQL function | Must be atomic; can't expose service role to frontend |
| Leaderboard ranking | Custom JS sort in frontend | PostgreSQL `ORDER BY` + optional `RANK()` | Correct tie-breaking, consistent ordering |
| Score input validation | Custom regex parser | `type="number" min="0" max="99"` HTML attribute | Browser handles it natively |
| Modal focus trap | Custom event listeners | `inert` attribute or simple `useEffect` focus call | Accessibility requirement from UI-SPEC |

**Key insight:** The two SQL functions are the most critical piece. If they're not written correctly (SECURITY DEFINER, correct exception names matching frontend error map, idempotent scoring), debugging token discrepancies in production is extremely painful.

---

## WC 2026 Match Schedule — Critical Count Clarification

**REQUIREMENTS.md and CONTEXT.md say "48 group-stage matches."** This is an error in the project documents. The correct count is:

- WC 2026: 48 teams, 12 groups of 4 teams each
- Each group plays 6 matches (round-robin within 4 teams)
- 12 × 6 = **72 group-stage matches** [VERIFIED: ESPN official schedule, Wikipedia]

The seed file `supabase/seed/matches_wc2026.sql` must contain all **72 matches**. The "Por grupo" view must cover groups A through L (12 groups, not 8). The tab row in CalendarPage must render 12 group tabs, not 8.

**All 72 group-stage matches with UTC times** (ET + 4h; verified source: ESPN official schedule [CITED: espn.com/soccer/story/_/id/48939282]):

```sql
-- groups A-D (June 11-20)
-- 2026-06-11 19:00:00 UTC | Group A | México vs Sudáfrica
-- 2026-06-12 02:00:00 UTC | Group A | Corea del Sur vs Chequia
-- 2026-06-12 19:00:00 UTC | Group B | Canadá vs Bosnia y Herzegovina
-- 2026-06-13 01:00:00 UTC | Group D | Estados Unidos vs Paraguay
-- 2026-06-13 19:00:00 UTC | Group B | Catar vs Suiza
-- 2026-06-13 22:00:00 UTC | Group C | Brasil vs Marruecos
-- 2026-06-14 01:00:00 UTC | Group C | Haití vs Escocia
-- 2026-06-14 04:00:00 UTC | Group D | Australia vs Turquía
-- 2026-06-14 17:00:00 UTC | Group E | Alemania vs Curazao
-- 2026-06-14 20:00:00 UTC | Group F | Países Bajos vs Japón
-- 2026-06-14 23:00:00 UTC | Group E | Costa de Marfil vs Ecuador
-- 2026-06-15 02:00:00 UTC | Group F | Suecia vs Túnez
-- 2026-06-15 17:00:00 UTC | Group H | España vs Cabo Verde
-- 2026-06-15 22:00:00 UTC | Group G | Bélgica vs Egipto
-- 2026-06-15 22:00:00 UTC | Group H | Arabia Saudita vs Uruguay
-- 2026-06-16 04:00:00 UTC | Group G | Irán vs Nueva Zelanda
-- 2026-06-16 19:00:00 UTC | Group I | Francia vs Senegal
-- 2026-06-16 22:00:00 UTC | Group I | Irak vs Noruega
-- 2026-06-17 01:00:00 UTC | Group J | Argentina vs Argelia
-- 2026-06-17 04:00:00 UTC | Group J | Austria vs Jordania
-- 2026-06-17 17:00:00 UTC | Group K | Portugal vs Rep. Dem. del Congo
-- 2026-06-17 20:00:00 UTC | Group L | Inglaterra vs Croacia
-- 2026-06-17 23:00:00 UTC | Group L | Ghana vs Panamá
-- 2026-06-18 02:00:00 UTC | Group K | Uzbekistán vs Colombia
-- 2026-06-18 16:00:00 UTC | Group A | Chequia vs Sudáfrica
-- 2026-06-18 19:00:00 UTC | Group B | Suiza vs Bosnia y Herzegovina
-- 2026-06-18 22:00:00 UTC | Group B | Canadá vs Catar
-- 2026-06-19 03:00:00 UTC | Group A | México vs Corea del Sur
-- 2026-06-19 19:00:00 UTC | Group D | Estados Unidos vs Australia
-- 2026-06-19 22:00:00 UTC | Group C | Escocia vs Marruecos
-- 2026-06-20 01:00:00 UTC | Group C | Brasil vs Haití
-- 2026-06-20 04:00:00 UTC | Group D | Turquía vs Paraguay
-- 2026-06-20 17:00:00 UTC | Group F | Países Bajos vs Suecia
-- 2026-06-20 20:00:00 UTC | Group E | Alemania vs Costa de Marfil
-- 2026-06-21 00:00:00 UTC | Group E | Ecuador vs Curazao
-- 2026-06-21 04:00:00 UTC | Group F | Túnez vs Japón
-- 2026-06-21 16:00:00 UTC | Group H | España vs Arabia Saudita
-- 2026-06-21 19:00:00 UTC | Group G | Bélgica vs Irán
-- 2026-06-21 22:00:00 UTC | Group H | Uruguay vs Cabo Verde
-- 2026-06-22 01:00:00 UTC | Group G | Nueva Zelanda vs Egipto
-- 2026-06-22 17:00:00 UTC | Group J | Argentina vs Austria
-- 2026-06-22 21:00:00 UTC | Group I | Francia vs Irak
-- 2026-06-23 00:00:00 UTC | Group I | Noruega vs Senegal
-- 2026-06-23 03:00:00 UTC | Group J | Jordania vs Argelia
-- 2026-06-23 17:00:00 UTC | Group K | Portugal vs Uzbekistán
-- 2026-06-23 20:00:00 UTC | Group L | Inglaterra vs Ghana
-- 2026-06-23 23:00:00 UTC | Group L | Panamá vs Croacia
-- 2026-06-24 02:00:00 UTC | Group K | Colombia vs Rep. Dem. del Congo
-- 2026-06-24 19:00:00 UTC | Group B | Suiza vs Canadá
-- 2026-06-24 19:00:00 UTC | Group B | Bosnia y Herzegovina vs Catar
-- 2026-06-24 22:00:00 UTC | Group C | Escocia vs Brasil
-- 2026-06-24 22:00:00 UTC | Group C | Marruecos vs Haití
-- 2026-06-25 01:00:00 UTC | Group A | Chequia vs México
-- 2026-06-25 01:00:00 UTC | Group A | Sudáfrica vs Corea del Sur
-- 2026-06-25 20:00:00 UTC | Group E | Ecuador vs Alemania
-- 2026-06-25 20:00:00 UTC | Group E | Curazao vs Costa de Marfil
-- 2026-06-25 23:00:00 UTC | Group F | Japón vs Suecia
-- 2026-06-25 23:00:00 UTC | Group F | Túnez vs Países Bajos
-- 2026-06-26 02:00:00 UTC | Group D | Turquía vs Estados Unidos
-- 2026-06-26 02:00:00 UTC | Group D | Paraguay vs Australia
-- 2026-06-26 19:00:00 UTC | Group I | Noruega vs Francia
-- 2026-06-26 19:00:00 UTC | Group I | Senegal vs Irak
-- 2026-06-27 00:00:00 UTC | Group H | Cabo Verde vs Arabia Saudita
-- 2026-06-27 00:00:00 UTC | Group H | Uruguay vs España
-- 2026-06-27 03:00:00 UTC | Group G | Egipto vs Irán
-- 2026-06-27 03:00:00 UTC | Group G | Nueva Zelanda vs Bélgica
-- 2026-06-27 21:00:00 UTC | Group L | Panamá vs Inglaterra
-- 2026-06-27 21:00:00 UTC | Group L | Croacia vs Ghana
-- 2026-06-27 23:30:00 UTC | Group K | Colombia vs Portugal
-- 2026-06-27 23:30:00 UTC | Group K | Rep. Dem. del Congo vs Uzbekistán
-- 2026-06-28 02:00:00 UTC | Group J | Argelia vs Austria
-- 2026-06-28 02:00:00 UTC | Group J | Jordania vs Argentina
```

---

## DB Schema Design (Claude's Discretion)

### matches table

```sql
create table public.matches (
  id              uuid        primary key default gen_random_uuid(),
  home_team       text        not null,
  away_team       text        not null,
  group_name      text        not null,  -- 'A' through 'L'
  match_datetime  timestamptz not null,  -- always UTC
  status          text        not null default 'scheduled'
                              check (status in ('scheduled', 'live', 'finished')),
  home_score      integer,               -- null until finished
  away_score      integer,               -- null until finished
  created_at      timestamptz not null default now()
);

-- Performance: calendar page fetches all matches ordered by datetime
create index matches_datetime_idx on public.matches (match_datetime);
-- Group-tabbed view filters by group_name
create index matches_group_idx on public.matches (group_name);

alter table public.matches enable row level security;

-- All authenticated users can read matches (public fixture data)
create policy "matches_select_authenticated"
  on public.matches for select
  to authenticated
  using (true);

-- No direct INSERT/UPDATE from frontend; seed via migration, updates via SQL function
-- (no INSERT or UPDATE policies — security definer functions bypass RLS)
```

### predictions table

```sql
create table public.predictions (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  match_id              uuid        not null references public.matches(id) on delete cascade,
  home_score_prediction integer     not null check (home_score_prediction >= 0),
  away_score_prediction integer     not null check (away_score_prediction >= 0),
  tokens_wagered        integer     not null default 20,
  tokens_awarded        integer,               -- null until scored
  points_earned         integer,               -- null until scored
  created_at            timestamptz not null default now(),
  -- One prediction per user per match (locked per D-12)
  unique (user_id, match_id)
);

-- Fetch all predictions for current user (modal badge display)
create index predictions_user_idx on public.predictions (user_id);
-- Scoring function iterates predictions by match
create index predictions_match_idx on public.predictions (match_id);

alter table public.predictions enable row level security;

-- User can read their own predictions
create policy "predictions_select_own"
  on public.predictions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No direct INSERT from frontend (place_prediction function does it)
-- No direct UPDATE from frontend (calculate_prediction_points does it)
```

### leaderboard_points column on profiles

Add to `profiles` via migration to support simple leaderboard query:

```sql
alter table public.profiles add column if not exists leaderboard_points integer not null default 0;
```

`calculate_prediction_points` increments this alongside `tokens`. The existing `profiles_select_own` RLS policy only allows users to read their own row — the leaderboard needs all users. Add a leaderboard-specific policy:

```sql
-- Allow authenticated users to read username + tokens + leaderboard_points for leaderboard
-- (does NOT expose email, is_admin, is_blocked)
create policy "profiles_select_leaderboard"
  on public.profiles for select
  to authenticated
  using (true);
```

**Wait — this conflicts with the existing `profiles_select_own` policy.** RLS uses OR logic: if any policy allows, the row is visible. Adding `using (true)` would make ALL profile columns readable by any authenticated user, exposing `is_admin` and `is_blocked`. 

**Better approach:** Create a `leaderboard_view` that exposes only `username`, `tokens`, and `leaderboard_points`:

```sql
create view public.leaderboard_view as
  select id, username, tokens, leaderboard_points
  from public.profiles
  order by leaderboard_points desc, tokens desc;

-- Views inherit the security context of the querying role
-- The underlying profiles table RLS does NOT apply to the view by default
-- Grant select on the view explicitly
grant select on public.leaderboard_view to authenticated;
```

This is the cleanest approach: profiles data stays RLS-protected at table level, leaderboard exposes only the safe columns.

---

## Common Pitfalls

### Pitfall 1: date-fns-tz v2 API Used in v3 Project

**What goes wrong:** `utcToZonedTime is not a function` or `zonedTimeToUtc is not a function` runtime error when the component renders.
**Why it happens:** date-fns-tz renamed its core functions in v3. Training data and most online tutorials reference v2. The installed version (3.2.0) does not export `utcToZonedTime`.
**How to avoid:** Always use `toZonedTime` and `fromZonedTime`. Use `formatInTimeZone` for simple display formatting.
**Warning signs:** TypeScript will not catch this if the type definitions are loose. Watch for undefined function errors at runtime.

### Pitfall 2: Grouping Matches by UTC Date Instead of Local Date

**What goes wrong:** A match at `2026-06-12T02:00:00Z` appears in the "June 12" bucket for Mexico City users, when it should be "June 11" (the match is at 10pm local time June 11).
**Why it happens:** Naive `match_datetime.substring(0, 10)` uses the UTC date string.
**How to avoid:** Use `toZonedTime()` to get the local zoned date, then `format(zonedDate, 'yyyy-MM-dd')` as the group key.
**Warning signs:** Users in early-UTC timezones (Europe) will see December matches appearing on the next day.

### Pitfall 3: 48 vs 72 Match Count in Seed File

**What goes wrong:** Seed file only includes matches from groups A–H (48 matches), missing groups I–L (24 more).
**Why it happens:** CONTEXT.md and REQUIREMENTS.md say "48 group-stage matches" — this refers to the 48 *teams* competing, not the match count. WC 2026 has 12 groups (A–L), not 8.
**How to avoid:** Seed all 72 matches. Group tabs in the UI must be A–L, not A–H.
**Warning signs:** Users cannot find Argentina, France, Portugal, England, etc. on the calendar.

### Pitfall 4: race condition in Token Deduction

**What goes wrong:** User opens the app in two browser tabs, both submit a prediction simultaneously. Both see 20 tokens, both call the RPC, both succeed. User ends up with -20 tokens.
**Why it happens:** PostgreSQL `CHECK (tokens >= 0)` on the profiles table provides the last-ditch defense, but without the `place_prediction` function's explicit check, the race could theoretically corrupt state.
**How to avoid:** The `place_prediction` function validates tokens in the same transaction as the deduction. The `CHECK` constraint on `profiles.tokens` is the absolute floor — the transaction will ROLLBACK if it violates it.
**Warning signs:** Users reporting negative token balances (should be impossible with the constraint).

### Pitfall 5: Prediction Modal Not Closed on Successful Submit Before Store Update

**What goes wrong:** Modal closes, but Navbar still shows the old token balance until the next render cycle.
**Why it happens:** Async state updates — the modal closes first, then the Zustand action runs.
**How to avoid:** Call `updateTokens(-20)` *before* closing the modal, or call it synchronously in the same event handler.

### Pitfall 6: UNIQUE Constraint on (user_id, match_id) Not Caught Gracefully

**What goes wrong:** User submits a prediction, network error shows, they try again. The second attempt fails with a Postgres UNIQUE constraint error. The frontend shows a generic error.
**Why it happens:** The constraint is correct and prevents duplicate predictions, but the error message is unhelpful.
**How to avoid:** Check `error.code === '23505'` (unique_violation) and show "Ya tienes una predicción para este partido." Alternatively, re-fetch the user's prediction after the error to show the existing one.

### Pitfall 7: RLS on `profiles` Blocks Leaderboard Cross-User Read

**What goes wrong:** Leaderboard page returns only the current user's own row, showing a leaderboard of 1.
**Why it happens:** `profiles_select_own` policy uses `auth.uid() = id`, which blocks reading other users' rows.
**How to avoid:** Use the `leaderboard_view` approach described in the schema section above — the view exposes only safe columns without exposing admin/blocked flags.

### Pitfall 8: Timezone Picker Fallback When Auto-Detection Returns Non-Listed IANA Zone

**What goes wrong:** User's browser returns `America/Los_Angeles` (not in the 15-option picker list). The timezone bar shows `undefined` or crashes.
**Why it happens:** `Intl.DateTimeFormat().resolvedOptions().timeZone` returns the OS timezone, which may not be in the curated list.
**How to avoid:** After auto-detection, check if the returned zone is in the list. If not, default to `UTC` (always in the list). Store whatever zone is actually used in localStorage so the picker doesn't override a valid detected zone.

---

## Code Examples

### Timezone Detection and Persistence

```typescript
// Source: [VERIFIED] — Intl.DateTimeFormat standard Web API; localStorage standard
const SUPPORTED_TIMEZONES = [
  { label: 'México (Centro)', iana: 'America/Mexico_City' },
  { label: 'México (Pacífico)', iana: 'America/Mazatlan' },
  { label: 'México (Cancún)', iana: 'America/Cancun' },
  { label: 'Colombia', iana: 'America/Bogota' },
  { label: 'Perú', iana: 'America/Lima' },
  { label: 'Ecuador', iana: 'America/Guayaquil' },
  { label: 'Venezuela', iana: 'America/Caracas' },
  { label: 'Bolivia', iana: 'America/La_Paz' },
  { label: 'Chile', iana: 'America/Santiago' },
  { label: 'Argentina / Uruguay', iana: 'America/Argentina/Buenos_Aires' },
  { label: 'Paraguay', iana: 'America/Asuncion' },
  { label: 'Cuba', iana: 'America/Havana' },
  { label: 'España (Península)', iana: 'Europe/Madrid' },
  { label: 'España (Canarias)', iana: 'Atlantic/Canary' },
  { label: 'UTC', iana: 'UTC' },
];

const STORAGE_KEY = 'fubol_timezone';
const SUPPORTED_IANA_SET = new Set(SUPPORTED_TIMEZONES.map(t => t.iana));

function detectTimezone(): string {
  // 1. Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_IANA_SET.has(stored)) return stored;

  // 2. Auto-detect browser timezone
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (SUPPORTED_IANA_SET.has(detected)) return detected;

  // 3. Fallback to UTC
  return 'UTC';
}

function saveTimezone(iana: string): void {
  localStorage.setItem(STORAGE_KEY, iana);
}
```

### Match Grouping by Local Date (Por fecha view)

```typescript
// Source: [VERIFIED] — tested against installed date-fns-tz v3.2.0 + date-fns v4.4.0
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

function groupMatchesByLocalDate(
  matches: Match[],
  timezone: string
): Map<string, Match[]> {
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const zonedDate = toZonedTime(new Date(match.match_datetime), timezone);
    const dateKey = format(zonedDate, 'yyyy-MM-dd');
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(match);
  }
  return grouped; // keys are sorted if matches are pre-sorted by match_datetime
}

function formatDateHeader(dateKey: string, timezone: string): string {
  // Produces "12 de junio" style header
  const zonedDate = toZonedTime(new Date(dateKey + 'T12:00:00Z'), timezone);
  return format(zonedDate, "d 'de' MMMM", { locale: es });
  // Note: requires date-fns/locale/es — already in date-fns v4 package
}
```

### Types Extension (src/types/index.ts additions)

```typescript
// Source: derived from CONTEXT.md DB schema decisions
export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  group_name: string;
  match_datetime: string;  // ISO string from DB, always UTC
  status: 'scheduled' | 'live' | 'finished';
  home_score: number | null;
  away_score: number | null;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score_prediction: number;
  away_score_prediction: number;
  tokens_wagered: number;
  tokens_awarded: number | null;
  points_earned: number | null;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  tokens: number;
  leaderboard_points: number;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `utcToZonedTime` (date-fns-tz v2) | `toZonedTime` (date-fns-tz v3) | date-fns-tz v3.0 release | Breaking rename — v2 function names silently fail at runtime |
| `zonedTimeToUtc` (date-fns-tz v2) | `fromZonedTime` (date-fns-tz v3) | date-fns-tz v3.0 release | Breaking rename |
| Supabase `.from().rpc()` (v1 pattern) | `supabase.rpc('fn', { args })` (v2 pattern) | supabase-js v2 | Args passed as plain object, not positional |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | WC 2026 group stage kickoff times converted from ET (UTC-4 EDT) to UTC are accurate as listed | WC 2026 Match Schedule | Wrong match times displayed on calendar; users miss predictions |
| A2 | `leaderboard_view` approach bypasses row-level security correctly for cross-user reads | DB Schema Design | Leaderboard shows only 1 user (blocked by profiles RLS) |
| A3 | Adding `leaderboard_points` column to profiles is preferable to aggregating from `predictions` at query time | DB Schema Design | Performance acceptable either way at this scale; purely a design choice |
| A4 | `calculate_prediction_points` is safe to call without `grant to authenticated` (service-role only) | Pattern 3 | If planner grants it to authenticated, any user can trigger scoring |

**A1 Note:** The ET times come from ESPN's official schedule page [CITED: espn.com]. June in North America is Eastern Daylight Time (EDT = UTC-4). Conversion is UTC = ET + 4 hours. The resulting UTC timestamps should be verified against official FIFA schedule before the seed SQL is accepted.

---

## Open Questions (RESOLVED)

1. **leaderboard_points column vs. aggregate from predictions**
   - RESOLVED: Use `leaderboard_points` column on `profiles` (denormalized) + `leaderboard_view` for ranked SELECT. Plans implement this in 02-01-PLAN.md Task 1 (migration adds column) and Task 3 (view definition).

2. **match_datetime schedule accuracy**
   - RESOLVED: All 72 UTC times derived from ESPN official fixture list (ET + 4h). Seed SQL header note instructs executor to verify unusual kickoff times (e.g., June 27 23:30 UTC) against official FIFA schedule before production push. Risk accepted for development; human checkpoint in 02-02-PLAN.md covers production verification.

3. **"Por grupo" UI — 8 groups mentioned in CONTEXT vs. 12 groups in actual WC 2026**
   - RESOLVED: Implement A–L (12 groups). CONTEXT.md D-01 "tabbed A–H" is a stale pre-research value written before the correct WC 2026 group count was confirmed. ROADMAP.md Phase 2 goal explicitly states 72 matches; success criterion 1 references groups A–L. Implementing A–H would be factually incorrect. All plans use A–L throughout.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, npm | ✓ | v18.19.1 (WSL2) | — |
| Supabase CLI | Migrations, functions deploy | ✓ | Linked to project pajowyfyvdscyqebbhkv | — |
| Supabase project | DB migrations | ✓ | pajowyfyvdscyqebbhkv ("sultanesFubol") | — |
| date-fns-tz v3 | Timezone conversion | ✓ | 3.2.0 (installed) | — |
| date-fns v4 | Date formatting | ✓ | 4.4.0 (installed) | — |
| date-fns/locale/es | Spanish date headers | ✓ | Included in date-fns v4 package | Fall back to English month names |

**Missing dependencies with no fallback:** None.

**Note on date-fns/locale/es:** The `es` locale for Spanish month names (needed for "12 de junio" date headers) is included in the date-fns v4 package — no separate install required. Import as `import { es } from 'date-fns/locale'`. [VERIFIED: inspected node_modules/date-fns]

---

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No — Phase 1 handles auth | Supabase Auth (established) |
| V3 Session Management | No — Phase 1 handles sessions | Supabase JWT (established) |
| V4 Access Control | Yes — predictions can only be placed by authenticated users; scoring only by admin | RLS on `predictions` + `security definer` functions with explicit grants |
| V5 Input Validation | Yes — score inputs (integer, min 0, max 99) | HTML `type="number" min="0" max="99"` + SQL `CHECK (score >= 0)` in DB |
| V6 Cryptography | No — no new cryptographic operations | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User submits prediction on behalf of another user | Spoofing | `place_prediction` uses `auth.uid()` internally — caller's identity, not a passed user_id |
| User triggers `calculate_prediction_points` to award themselves tokens | Elevation of Privilege | No `grant to authenticated` on `calculate_prediction_points` — service role only |
| User bypasses 20-token cost via direct `predictions` INSERT | Tampering | No INSERT policy on `predictions` table (security definer function only) |
| Negative token balance via concurrent submissions | Tampering | `CHECK (tokens >= 0)` DB constraint + `place_prediction` explicit pre-check |
| User reads another user's prediction history | Information Disclosure | `predictions_select_own` RLS policy restricts to `auth.uid() = user_id` |
| Admin column leakage via leaderboard query | Information Disclosure | `leaderboard_view` exposes only `username`, `tokens`, `leaderboard_points` — not `is_admin` or `is_blocked` |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — date-fns v4.4.0, date-fns-tz v3.2.0, @supabase/supabase-js v2.107.0, zustand v5.0.14, react-router-dom v7.17.0 — all installed and inspected via node_modules
- [VERIFIED: node_modules/date-fns-tz] — v3 API exports confirmed by running `require()` in Node.js against installed package; `toZonedTime` and `fromZonedTime` confirmed; `utcToZonedTime` confirmed absent
- [VERIFIED: node_modules/date-fns-tz] — `formatInTimeZone` confirmed working; tested with WC2026 UTC datetime against America/Mexico_City and America/Argentina/Buenos_Aires

### Secondary (MEDIUM confidence)
- [CITED: supabase.com/docs/reference/javascript/rpc] — `supabase.rpc('fn', { args })` syntax confirmed
- [CITED: supabase.com/docs/guides/database/functions] — SECURITY DEFINER pattern, `set search_path = public`, privilege revocation/grant pattern
- [CITED: supabase.com/docs/guides/database/postgres/row-level-security] — `(select auth.uid()) = user_id` performance pattern; blocking direct writes via no INSERT policy
- [CITED: espn.com/soccer/story/_/id/48939282] — All 72 group-stage fixtures with ET kickoff times

### Tertiary (LOW confidence / ASSUMED)
- A2: `leaderboard_view` SELECT bypasses underlying table RLS — [ASSUMED] standard PostgreSQL view behavior; recommend verifying in Supabase dashboard after migration
- A3: Scoring rules derived verbatim from CONTEXT.md D-11 — not verified against official quinielas rules

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages are already installed and verified against installed node_modules
- Architecture: HIGH — follows established Phase 1 patterns; no new patterns introduced
- DB schema: MEDIUM — column choices are within Claude's Discretion; leaderboard_view approach is [ASSUMED] to bypass table-level RLS correctly
- Match schedule UTC times: MEDIUM — derived from ESPN official ET times; verify before seeding production
- SQL function patterns: HIGH — verified against Supabase official docs
- Pitfalls: HIGH — most verified by testing installed packages

**Research date:** 2026-06-05
**Valid until:** 2026-06-12 (stable stack; WC 2026 schedule is now live, times could shift slightly before tournament starts)
