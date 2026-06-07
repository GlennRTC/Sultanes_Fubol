# Phase 3: Apuestas (Bet Pools) — Research

**Researched:** 2026-06-06
**Domain:** Supabase Realtime (postgres_changes), parimutuel token payout, PostgreSQL SECURITY DEFINER functions, React component-state management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Bets are user-chosen token amounts — the user types how many fichas to wager on an option. Not a fixed amount.
- **D-02:** Minimum bet: 10 fichas. Enforced at the DB level in `place_bet` SQL function.
- **D-03:** One bet per pool per user, locked on submit — no updates, no cancellations. UNIQUE constraint on `(user_id, pool_id)`.
- **D-04:** Each pool card shows: pool question, each option with its current parimutuel percentage, and the pool deadline. No total-tokens-wagered figure on the card.
- **D-05:** Odds update in real-time via Supabase Realtime channel subscription on the `bets` table.
- **D-06:** After a user bets, the card shows a badge: "Tu apuesta: España · 150 fichas". Clicking the pool card opens a read-only modal.
- **D-07:** Phase 3 implements two pool types only: `binary` and `multiple_exclusive`. `numeric_range` deferred to Phase 4.
- **D-08:** Admin creates pools by inserting directly into the Supabase Table Editor or SQL editor. No frontend admin pool-creation UI in Phase 3.
- **D-09:** Bet history is embedded in the `/apuestas` pools page. "Activas" and "Cerradas" sections.
- **D-10:** Win outcome badge: "Ganaste: +320 fichas" (green). Loss outcome: "Perdiste" (slate/muted).
- **D-11:** 500 fichas initial grant remains. Token name stays "fichas".
- **D-12:** No house cut on pool payouts. Zero-sum per pool.
- **D-13:** `token_transactions` table is an internal audit log in Phase 3. No user-facing ledger page.

### Claude's Discretion

- DB schema details: column names, index definitions, trigger implementations beyond the tables named above.
- `place_bet` function internals: parameter names, exception codes, return type.
- `resolve_pool` function internals: payout calculation, rounding (Math.floor per CLAUDE.md).
- Pool card component structure and CSS — follow Phase 2 card + badge patterns.
- Supabase Realtime subscription implementation details (channel name scheme, filter expressions).
- Exact pool status enum values (e.g., `open`, `closed`, `resolved`).

### Deferred Ideas (OUT OF SCOPE)

- `numeric_range` pool type — deferred to Phase 4 alongside admin panel.
- User-visible token transaction ledger (`/historial-fichas`) — deferred to Phase 4 admin reporting.
- Admin pool creation frontend UI — deferred to Phase 4 (ADM-05).
- Increasing/modifying a bet after placement — explicitly excluded.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APU-01 | Admin can create a betting pool (binary / multiple_exclusive) with 2–4 options and a deadline | `bet_pools` + `pool_options` tables; admin inserts via Supabase dashboard; status enum `open/closed/resolved` |
| APU-02 | All authenticated users can see open pools and live parimutuel odds | `bets` table SELECT policy for authenticated; Realtime channel on `bets` table; parimutuel formula |
| APU-03 | User can bet tokens on one option per pool before the deadline | `place_bet` SECURITY DEFINER function; `FOR UPDATE` lock on profile row; pool status gate |
| APU-04 | Bets are rejected at the DB level if user has insufficient tokens | `SELECT tokens FROM profiles FOR UPDATE` + CHECK constraint on profiles.tokens; `raise exception 'insufficient_tokens'` |
| APU-05 | Duplicate bets rejected — UNIQUE constraint enforced in DB | `UNIQUE (user_id, pool_id)` on `bets` table; error code 23505 maps to Spanish message |
| APU-06 | Admin resolves pool; tokens distributed proportionally to winners, no house cut | `resolve_pool` SECURITY DEFINER function; parimutuel formula: `Math.floor(user_tokens_wagered / winning_option_total * pool_total)`; loop over winning bets |
| APU-07 | User can view bet history showing win/loss status and tokens won | `bets` table with `tokens_won` column nullable; ApuestasPage "Activas"/"Cerradas" sections; pool card bet badges |
| TOK-01 | Admin can add tokens to any user account | Admin inserts profile update via service role (dashboard); `token_transactions` record type `admin_grant` |
| TOK-02 | Every token movement creates a `token_transactions` record | `token_transactions` table; written by `place_bet` and `resolve_pool` SECURITY DEFINER functions |
| TOK-03 | Token balance can never drop below 0 — enforced by DB CHECK constraint | `CHECK (tokens >= 0)` already exists via Phase 1 migration; `place_bet` raises `insufficient_tokens` before deduction |
</phase_requirements>

---

## Summary

Phase 3 adds four new tables (`bet_pools`, `pool_options`, `bets`, `token_transactions`), two SECURITY DEFINER SQL functions (`place_bet`, `resolve_pool`), a new page (`/apuestas`), and two new components (`PoolCard`, `BetModal`). The architecture is a direct extension of the Phase 2 pattern: SECURITY DEFINER functions own all token mutations, the frontend calls `supabase.rpc()`, and Zustand's `updateTokens(delta)` syncs the Navbar immediately after a successful RPC call.

The most technically novel element is Supabase Realtime: a `postgres_changes` subscription on the `bets` table delivers INSERT events to all subscribed clients, enabling live parimutuel odds recalculation in the browser without polling. For this to work, the `bets` table needs (a) an entry in `supabase_realtime` publication and (b) a permissive SELECT RLS policy for `authenticated` — because Realtime checks that policy before delivering each event to each subscriber. [VERIFIED: docs.supabase.com/guides/realtime/postgres-changes]

The `resolve_pool` function is service-role-only (same pattern as `calculate_prediction_points`). The parimutuel payout formula is integer division with `Math.floor` (CLAUDE.md constraint): each winner receives `FLOOR(user_wagered / winning_option_total_wagered * pool_total_wagered)`. Rounding loss is absorbed; no remainders are re-distributed (zero-sum guarantee is approximate by at most 1 ficha per winner, which is acceptable for a gamification token economy).

**Primary recommendation:** Mirror the Phase 2 migration + component pattern exactly. New migration `0004_bet_pools.sql`, new page `ApuestasPage`, new components `PoolCard` and `BetModal`. No new npm packages. No new Zustand store — all state in `ApuestasPage` component state, identical to `CalendarPage`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bet placement (token deduction + bets INSERT) | Database (SECURITY DEFINER) | — | All token mutations must be DB-side per CLAUDE.md; frontend never writes tokens directly |
| Pool resolution + payout distribution | Database (SECURITY DEFINER, service-role) | — | Payout is a token mutation; service-role only, not callable by authenticated users |
| Live parimutuel odds | Browser (React state) | Supabase Realtime (delivery) | Odds are a derived frontend calculation from aggregated bet totals; Realtime pushes raw INSERT events |
| Pool + bet data fetch on page load | Frontend (API call via supabase-js) | — | Standard one-time fetch in useEffect, same pattern as CalendarPage |
| Bet history display (win/loss badges) | Browser (React) | — | Derived from joined pool + bet data already fetched on page load |
| Pool status transitions (open → closed) | Admin (manual via dashboard) | — | No cron automation in Phase 3; admin sets `status='closed'` manually after deadline, then calls resolve_pool |
| token_transactions audit log | Database (SECURITY DEFINER functions) | — | Written inside place_bet and resolve_pool, never from the frontend |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.107.0 (installed) | Realtime channel subscription, RPC calls, table queries | Already in project; singleton client in `src/lib/supabase.ts` |
| React 18 + hooks | 18.x (installed) | Component state, useEffect subscription lifecycle | Fixed stack |
| TailwindCSS | (installed) | All styling — no new UI libraries | Fixed stack |
| Zustand `useAuthStore` | 4.5.7 (installed) | `updateTokens(delta)` for Navbar sync after bet | Already in project; no new store needed |

[VERIFIED: npm registry — all packages already installed in project, confirmed via package.json]

### No New Packages

Phase 3 introduces zero new npm dependencies. All required capabilities (Realtime, RPC, component patterns, styling) are covered by the existing stack.

**Installation:**

```bash
# No new packages required
```

---

## Package Legitimacy Audit

No new packages are introduced in Phase 3. This section is not applicable.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
User browser
    │
    ├── Page load: supabase.from('bet_pools').select(...)   ──► Supabase DB (bet_pools + pool_options)
    │             supabase.from('bets').select(...)          ──► Supabase DB (bets — user's own bets)
    │
    ├── Realtime subscription (useEffect mount):
    │     supabase.channel('bets-pool-[pool_id]')
    │       .on('postgres_changes', INSERT on bets)
    │       .subscribe()
    │
    │   ◄── Realtime event: new INSERT on bets table
    │         → recalculate parimutuel % in local state
    │         → re-render PoolCard odds display
    │
    ├── User clicks "Confirmar apuesta":
    │     supabase.rpc('place_bet', { p_pool_id, p_option_id, p_amount })
    │         │
    │         ▼
    │     SECURITY DEFINER place_bet():
    │       SELECT tokens FROM profiles FOR UPDATE
    │       → validate pool is 'open', amount >= 10, no duplicate
    │       → UPDATE profiles SET tokens = tokens - amount
    │       → INSERT INTO bets
    │       → INSERT INTO token_transactions (type='pool_bet')
    │
    │     on success:
    │       useAuthStore.updateTokens(-amount)   ──► Navbar token balance updates
    │       inject synthetic bet into local state ──► PoolCard shows bet badge
    │
    └── Admin (Supabase dashboard, service role):
          UPDATE bet_pools SET status='resolved', winning_option_id=...
          → calls resolve_pool(p_pool_id, p_winning_option_id)
                │
                ▼
          SECURITY DEFINER resolve_pool():
            UPDATE bet_pools SET status='resolved', winning_option_id=...
            FOR EACH winning bet:
              payout = FLOOR(user_wagered / winning_total * pool_total)
              UPDATE profiles SET tokens = tokens + payout
              INSERT INTO token_transactions (type='pool_payout')
```

### Recommended Project Structure

```
src/
├── pages/
│   └── ApuestasPage.tsx     # New — pools list, sections, Realtime sub, data fetch
├── components/
│   ├── PoolCard.tsx          # New — single pool card with odds + bet badge
│   └── BetModal.tsx          # New — two-step bet modal (mirrors PredictionModal)
├── types/
│   └── index.ts              # Extend with BetPool, PoolOption, Bet, TokenTransaction types + DB rows
supabase/
└── migrations/
    └── 0004_bet_pools.sql    # New — all tables, RLS, functions
```

### Pattern 1: SECURITY DEFINER `place_bet` Function

**What:** Atomically validates pool status, enforces minimum bet, checks token balance, deducts tokens, inserts bet record, inserts token_transactions record. Row-locks the profile before checking balance (learned from CR-02 fix in 0003_phase02_fixes.sql).

**When to use:** Every time a user places a bet.

```sql
-- Source: established project pattern from 0002_matches_predictions.sql + 0003_phase02_fixes.sql
create or replace function public.place_bet(
  p_pool_id   uuid,
  p_option_id uuid,
  p_amount    integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_pool_status text;
  v_deadline   timestamptz;
  v_user_tokens integer;
begin
  -- Validate pool is open and before deadline
  select status, deadline
  into v_pool_status, v_deadline
  from public.bet_pools
  where id = p_pool_id;

  if not found then
    raise exception 'pool_not_found';
  end if;

  if v_pool_status <> 'open' then
    raise exception 'pool_not_open';
  end if;

  if now() >= v_deadline then
    raise exception 'pool_deadline_passed';
  end if;

  -- Validate option belongs to this pool
  if not exists (
    select 1 from public.pool_options
    where id = p_option_id and pool_id = p_pool_id
  ) then
    raise exception 'option_not_found';
  end if;

  -- Minimum bet enforcement (D-02)
  if p_amount < 10 then
    raise exception 'below_minimum_bet';
  end if;

  -- Lock profile row to prevent TOCTOU race (CR-02 pattern)
  select tokens into v_user_tokens
  from public.profiles
  where id = v_user_id
  for update;

  if v_user_tokens < p_amount then
    raise exception 'insufficient_tokens';
  end if;

  -- Deduct tokens
  update public.profiles
  set tokens = tokens - p_amount
  where id = v_user_id;

  -- Insert bet (UNIQUE constraint on user_id + pool_id catches duplicate)
  insert into public.bets (user_id, pool_id, option_id, tokens_wagered)
  values (v_user_id, p_pool_id, p_option_id, p_amount);

  -- Audit record (TOK-02)
  insert into public.token_transactions (user_id, amount, type, reference_id)
  values (v_user_id, -p_amount, 'pool_bet', p_pool_id);
end;
$$;

revoke execute on function public.place_bet(uuid, uuid, integer) from public, anon;
grant execute on function public.place_bet(uuid, uuid, integer) to authenticated;
```

[ASSUMED — exact parameter names and exception strings are Claude's discretion per CONTEXT.md; the pattern mirrors verified project code from 0002/0003 migrations]

### Pattern 2: SECURITY DEFINER `resolve_pool` Function (service-role only)

**What:** Marks pool as resolved with winning option, distributes parimutuel tokens to winners, inserts token_transactions records.

```sql
-- Source: established project pattern; resolve is service-role only (same as calculate_prediction_points)
create or replace function public.resolve_pool(
  p_pool_id          uuid,
  p_winning_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool_total     integer;
  v_winning_total  integer;
  v_bet            record;
  v_payout         integer;
begin
  -- Sum all tokens wagered in the pool
  select coalesce(sum(tokens_wagered), 0)
  into v_pool_total
  from public.bets
  where pool_id = p_pool_id;

  -- Sum tokens wagered on the winning option
  select coalesce(sum(tokens_wagered), 0)
  into v_winning_total
  from public.bets
  where pool_id = p_pool_id and option_id = p_winning_option_id;

  -- Mark pool resolved
  update public.bet_pools
  set status = 'resolved',
      winning_option_id = p_winning_option_id
  where id = p_pool_id;

  -- If no winning bets (winning_total = 0), no payouts to distribute
  if v_winning_total = 0 then
    return;
  end if;

  -- Distribute tokens proportionally (Math.floor per CLAUDE.md — integers only)
  for v_bet in
    select id, user_id, tokens_wagered
    from public.bets
    where pool_id = p_pool_id and option_id = p_winning_option_id
  loop
    v_payout := floor(v_bet.tokens_wagered::numeric / v_winning_total * v_pool_total)::integer;

    update public.profiles
    set tokens = tokens + v_payout
    where id = v_bet.user_id;

    -- Record payout and mark bet as won with amount
    update public.bets
    set tokens_won = v_payout
    where id = v_bet.id;

    insert into public.token_transactions (user_id, amount, type, reference_id)
    values (v_bet.user_id, v_payout, 'pool_payout', p_pool_id);
  end loop;
end;
$$;

-- Service-role only — same pattern as calculate_prediction_points
revoke execute on function public.resolve_pool(uuid, uuid) from public, anon, authenticated;
```

[ASSUMED — exact SQL structure; pattern verified against 0002_matches_predictions.sql and 0003_phase02_fixes.sql in codebase]

### Pattern 3: Supabase Realtime Subscription in React

**What:** Subscribe to all INSERTs on `bets` table to recalculate live parimutuel odds. One channel per page mount, cleaned up on unmount.

**When to use:** In `ApuestasPage` `useEffect` after initial data fetch.

```typescript
// Source: [CITED: docs.supabase.com/guides/realtime/postgres-changes]
useEffect(() => {
  const channel = supabase
    .channel('bets-all')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bets',
      },
      (payload) => {
        // payload.new is the inserted bet row: { pool_id, option_id, tokens_wagered, ... }
        // Merge into local poolBetTotals state to recompute odds
        const newBet = payload.new as { pool_id: string; option_id: string; tokens_wagered: number };
        setBetTotals((prev) => {
          const updated = { ...prev };
          const poolTotals = updated[newBet.pool_id] ?? {};
          poolTotals[newBet.option_id] = (poolTotals[newBet.option_id] ?? 0) + newBet.tokens_wagered;
          updated[newBet.pool_id] = poolTotals;
          return updated;
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []); // empty deps — subscribe once on mount
```

[CITED: docs.supabase.com/guides/realtime/postgres-changes — channel() and removeChannel() API verified]

### Pattern 4: Parimutuel Odds Calculation (Frontend Display)

**What:** Derive the percentage for each option from accumulated bet totals.

```typescript
// Source: 03-UI-SPEC.md §Data-Driven UI Rules (project document)
function calcOdds(
  optionTotals: Record<string, number>  // option_id -> total tokens wagered
): Record<string, number | null> {
  const poolTotal = Object.values(optionTotals).reduce((s, v) => s + v, 0);
  if (poolTotal === 0) return Object.fromEntries(Object.keys(optionTotals).map((k) => [k, null]));
  return Object.fromEntries(
    Object.entries(optionTotals).map(([id, total]) => [
      id,
      Math.round((total / poolTotal) * 100),
    ])
  );
}
// null means "no bets yet" → display "—" per UI-SPEC
```

[ASSUMED — exact TypeScript structure; formula from UI-SPEC §Data-Driven UI Rules]

### Pattern 5: Optimistic Badge Update After Bet (mirrors CalendarPage)

```typescript
// Source: CalendarPage.tsx handlePredictionSuccess pattern (codebase)
function handleBetSuccess(poolId: string, optionId: string, amount: number) {
  const newBet: Bet = {
    id: `local-${Date.now()}`,
    user_id: '',          // filled by DB; local placeholder
    pool_id: poolId,
    option_id: optionId,
    tokens_wagered: amount,
    tokens_won: null,
    created_at: new Date().toISOString(),
  };
  setBets((prev) => [...prev, newBet]);
  useAuthStore.getState().updateTokens(-amount);
}
```

[ASSUMED — exact function structure; pattern directly mirrors CalendarPage.tsx `handlePredictionSuccess`]

### Anti-Patterns to Avoid

- **No bet store (betStore.ts):** CalendarPage uses only component state for matches and predictions. ApuestasPage follows the same pattern. Adding a Zustand store for bets is unnecessary complexity — `authStore.updateTokens()` is the only cross-component concern.
- **Do not fetch bets for ALL users on page load:** The initial `bets` query should be scoped to `where user_id = auth.uid()`. Odds are computed from the running Realtime totals (seeded from initial aggregated query), not from all users' full bet rows.
- **Do not seed initial odds from raw bets SELECT:** Query aggregate totals by option at page load (e.g., via a view or an RPC), not raw rows. Raw bet rows expose other users' individual wager amounts, which is an unnecessary data exposure even if not a security violation under the permissive odds SELECT policy.
- **Never call resolve_pool from the frontend:** It is `revoke ... from authenticated` — attempting to call it returns a permission error. The admin calls it via the Supabase SQL Editor (Phase 3) or a future admin UI (Phase 4).
- **Do not forget `alter publication supabase_realtime add table bets`** in the migration — without this, the Realtime channel subscription silently receives no events.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token deduction safety | Frontend balance check | SECURITY DEFINER `place_bet` with `FOR UPDATE` profile lock | Race condition: two concurrent bets both pass a frontend check; only a serialized DB lock prevents double-spend |
| Duplicate bet prevention | Frontend check for existing bet | UNIQUE constraint on `(user_id, pool_id)` + error code 23505 mapping | TOCTOU: two tabs can simultaneously submit; only a DB UNIQUE constraint is reliable |
| Parimutuel payout | Custom remainder distribution algorithm | `FLOOR(wagered / winning_total * pool_total)` in `resolve_pool` | Rounding is at most 1 ficha per winner; distributing remainders adds complexity with no meaningful gain in a token economy |
| Real-time odds polling | `setInterval` + refetch | Supabase Realtime `postgres_changes` INSERT subscription | Polling creates unnecessary DB load; Realtime delivers sub-second event propagation |
| Pool status change | Scheduled Netlify Edge Function or cron | Admin manual update via Supabase dashboard | No server infrastructure needed in Phase 3; admin closes pools by setting status = 'closed' |

**Key insight:** Every token mutation that goes wrong is either invisible (double-spend) or data-corrupting (negative balance). The SECURITY DEFINER + `FOR UPDATE` pattern from Phase 2 is the only safe approach — hand-rolling alternatives will introduce races or incorrect payouts at a 1000 ms latency difference.

---

## Common Pitfalls

### Pitfall 1: Realtime Events Silently Missing — Table Not in Publication

**What goes wrong:** The Realtime subscription channel is created, `.subscribe()` resolves without error, but no INSERT events are ever delivered to the callback.

**Why it happens:** Tables must be explicitly added to the `supabase_realtime` Postgres publication. A new table created in a migration is NOT automatically added.

**How to avoid:** Include `alter publication supabase_realtime add table bets;` in `0004_bet_pools.sql`. Verify in Supabase Dashboard → Database → Replication.

**Warning signs:** Subscription status callback shows `SUBSCRIBED` but `setBetTotals` is never called after a known bet INSERT.

[CITED: docs.supabase.com/guides/realtime/postgres-changes — "Enable Realtime Replication" step]

### Pitfall 2: Realtime Events Missing — No SELECT RLS Policy on `bets`

**What goes wrong:** Realtime subscription shows `SUBSCRIBED` status, bets table is in publication, but INSERT events are not delivered to authenticated users.

**Why it happens:** For Realtime postgres_changes, every event is checked against the subscriber's RLS SELECT policies. If no SELECT policy exists (or the policy is too restrictive), the event is silently dropped for that subscriber.

**How to avoid:** Create a permissive SELECT policy on `bets` for authenticated users:

```sql
-- Odds are public data — all authenticated users can see bet totals
create policy "bets_select_authenticated"
  on public.bets for select
  to authenticated
  using (true);
```

This does NOT expose individual user bet amounts on the frontend — the frontend only uses aggregated totals derived from Realtime events. Individual bets are only queryable via SELECT, and the frontend query is scoped to `auth.uid()` for the user's own bets.

[CITED: docs.supabase.com/guides/realtime/postgres-changes#rls-policies]

**Warning signs:** Realtime events missing in production but present when tested with service-role key or RLS disabled.

### Pitfall 3: TOCTOU Race on Token Deduction (Learned from CR-02)

**What goes wrong:** Two concurrent `place_bet` calls both pass the `v_user_tokens < p_amount` check (user has exactly `p_amount` tokens), then both execute the UPDATE, driving balance to `-p_amount`, triggering the CHECK constraint (error 23514) instead of the mapped `insufficient_tokens` exception.

**Why it happens:** The token read and token update are two separate statements. Without a row lock, another transaction can interleave between them.

**How to avoid:** Use `SELECT tokens FROM profiles WHERE id = v_user_id FOR UPDATE` before the balance check. This is already the pattern in `0003_phase02_fixes.sql` (CR-02 fix). Apply the same pattern in `place_bet`.

[VERIFIED: supabase/migrations/0003_phase02_fixes.sql — CR-02 comment documents this exact fix]

### Pitfall 4: Division by Zero in Frontend Odds Display

**What goes wrong:** A newly created pool has no bets yet. Computing `option_total / pool_total * 100` crashes with NaN or Infinity.

**Why it happens:** `pool_total` is 0 on pool creation, and division by zero in JavaScript returns `Infinity` or `NaN`.

**How to avoid:** Guard explicitly — see Pattern 4 above: `if (poolTotal === 0) return null for all options; display "—"`.

[ASSUMED — standard JavaScript behavior; UI-SPEC explicitly documents the "—" fallback]

### Pitfall 5: `updateTokens` Called on RPC Error Path

**What goes wrong:** The Navbar token balance decreases even when `place_bet` fails (e.g., if `updateTokens(-amount)` is called before the RPC response is checked).

**Why it happens:** Developer calls `updateTokens` optimistically before awaiting the RPC.

**How to avoid:** Call `updateTokens(-amount)` only in the success branch, after confirming `error === null`. This is explicitly called out in the PredictionModal.tsx code comment: "Update Zustand store before closing to sync Navbar balance immediately (Pitfall 5)".

[VERIFIED: src/components/PredictionModal.tsx line 75 — established project pattern]

### Pitfall 6: `resolve_pool` Payout Zero When Winning Option Has No Bets

**What goes wrong:** Admin resolves a pool selecting an option that nobody bet on. Payout loop iterates over zero rows — no error, no tokens distributed. Losers' tokens simply vanish.

**Why it happens:** `v_winning_total = 0`; `FLOOR(x / 0 * y)` would be division by zero.

**How to avoid:** Guard with `IF v_winning_total = 0 THEN RETURN;` before the payout loop. Consider also marking losing bets' `tokens_won = 0` for history display. In practice, the admin should not select an option with no bets; the resolution UI (Phase 4) should surface this. For Phase 3, the guard prevents a crash.

[ASSUMED — mathematical edge case; standard parimutuel practice]

### Pitfall 7: Realtime Channel Not Cleaned Up on Unmount

**What goes wrong:** Navigating away from `/apuestas` and back creates a new subscription each time, leading to duplicate event processing, stale state updates, and eventually hitting the 200 concurrent connection limit.

**Why it happens:** `useEffect` without a cleanup function leaves the channel open after component unmount.

**How to avoid:** Always return `() => supabase.removeChannel(channel)` from the `useEffect` that creates the subscription. See Pattern 3 above.

[CITED: docs.supabase.com/reference/javascript/removechannel]

---

## Database Schema Design

### Tables

**`bet_pools`**

```sql
create table public.bet_pools (
  id                uuid        primary key default gen_random_uuid(),
  question          text        not null,
  type              text        not null check (type in ('binary', 'multiple_exclusive')),
  status            text        not null default 'open'
                                check (status in ('open', 'closed', 'resolved')),
  deadline          timestamptz not null,                   -- always UTC
  winning_option_id uuid,                                   -- null until resolved
  created_at        timestamptz not null default now()
);
```

**`pool_options`**

```sql
create table public.pool_options (
  id       uuid  primary key default gen_random_uuid(),
  pool_id  uuid  not null references public.bet_pools(id) on delete cascade,
  label    text  not null,
  position integer not null,    -- display order (1-based)
  created_at timestamptz not null default now()
);
```

**`bets`**

```sql
create table public.bets (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  pool_id        uuid        not null references public.bet_pools(id) on delete cascade,
  option_id      uuid        not null references public.pool_options(id) on delete cascade,
  tokens_wagered integer     not null check (tokens_wagered >= 10),
  tokens_won     integer,               -- null until resolved
  created_at     timestamptz not null default now(),
  unique (user_id, pool_id)             -- APU-05: one bet per pool per user
);
```

**`token_transactions`**

```sql
create table public.token_transactions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  amount       integer     not null,    -- negative = debit, positive = credit
  type         text        not null
               check (type in (
                 'pool_bet',        -- debit when placing a bet
                 'pool_payout',     -- credit when winning a pool
                 'prediction_bet',  -- debit for quiniela (future retroactive insert)
                 'prediction_payout', -- credit for quiniela scoring (future)
                 'admin_grant'      -- credit from admin token grant
               )),
  reference_id uuid,                    -- pool_id for pool_bet/payout; match_id for predictions; null for admin
  created_at   timestamptz not null default now()
);
```

[ASSUMED — exact column names and check values are Claude's discretion per CONTEXT.md; design is consistent with project conventions in 0002 migration]

### RLS Policies

```sql
-- bet_pools: all authenticated can read (odds are public)
create policy "bet_pools_select_authenticated" on public.bet_pools
  for select to authenticated using (true);

-- pool_options: all authenticated can read (needed to display options)
create policy "pool_options_select_authenticated" on public.pool_options
  for select to authenticated using (true);

-- bets: all authenticated can read (required for Realtime events + odds aggregation)
create policy "bets_select_authenticated" on public.bets
  for select to authenticated using (true);
-- Note: No INSERT policy — all writes via place_bet SECURITY DEFINER only

-- token_transactions: internal audit log — no user SELECT in Phase 3
-- (service role only; user ledger deferred to Phase 4)
```

[ASSUMED — exact policy names; pattern verified against 0002 migration style]

---

## Code Examples

### Verified Patterns from Project Codebase

#### Error Code Mapping (BetModal, mirrors PredictionModal.tsx lines 62–69)

```typescript
// Source: src/components/PredictionModal.tsx — established error mapping pattern
if (rpcError.message.includes('insufficient_tokens')) {
  setError('No tienes suficientes fichas para esta apuesta.');
} else if (rpcError.message.includes('pool_not_open')) {
  setError('Esta apuesta ya no acepta fichas.');
} else if (rpcError.message.includes('below_minimum_bet')) {
  setError('El mínimo es 10 fichas.');
} else if (rpcError.code === '23505') {
  // Unique constraint violation — duplicate bet
  setError('Ya tienes una apuesta en este pool.');
} else {
  setError('No se pudo registrar tu apuesta. Intenta de nuevo.');
}
setStep('input');
setLoading(false);
```

[VERIFIED: src/components/PredictionModal.tsx — exact error-mapping pattern confirmed in codebase]

#### Page-Level Data Fetch (ApuestasPage, mirrors CalendarPage.tsx lines 54–77)

```typescript
// Source: src/pages/CalendarPage.tsx — established parallel fetch pattern
useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const [
      { data: poolData, error: poolError },
      { data: betData, error: betError },
      { data: totalsData, error: totalsError },
    ] = await Promise.all([
      supabase.from('bet_pools').select('*, pool_options(*)').order('deadline'),
      supabase.from('bets').select('*').eq('user_id', user!.id),
      supabase.rpc('get_bet_totals'),  // optional aggregation RPC; see Open Questions
    ]);
    // ...
  }
  fetchData();
}, []);
```

[VERIFIED: src/pages/CalendarPage.tsx — parallel fetch pattern confirmed]

#### Supabase Realtime enablement in migration

```sql
-- Source: [CITED: docs.supabase.com/guides/realtime/postgres-changes]
-- Must be in 0004_bet_pools.sql — silently broken without this line
alter publication supabase_realtime add table bets;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase v1 `from().on()` subscription API | `supabase.channel().on('postgres_changes', ...).subscribe()` | supabase-js v2 | Channel-based API; channel name is arbitrary string; cleanup via `removeChannel()` |
| `supabase.removeSubscription()` (v1) | `supabase.removeChannel(channel)` (v2) | supabase-js v2 | New cleanup method name |
| Broadcast via custom realtime server | Postgres Changes (`postgres_changes` event) | supabase-js v2 | No separate broadcast server needed; Postgres WAL is the event source |

[CITED: docs.supabase.com/guides/realtime/subscribing-to-database-changes]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `place_bet` function parameter names (`p_pool_id`, `p_option_id`, `p_amount`) | Pattern 1 | Wrong param names cause RPC call failure; easy to fix |
| A2 | `resolve_pool` is called by admin via Supabase SQL Editor in Phase 3 | Architecture Map | If admin expects a UI button, this will be confusing — but CONTEXT.md D-08 confirms dashboard-only in Phase 3 |
| A3 | `token_transactions` type enum values (`pool_bet`, `pool_payout`, etc.) | Schema Design | If enum values differ, migrations error with CHECK constraint violation |
| A4 | Initial bet totals for odds are seeded from an aggregation RPC or SQL view at page load | Code Examples | If fetched from raw bets SELECT (all users' bets), it works but exposes unnecessary data |
| A5 | Admin closes a pool manually by setting `status='closed'` via dashboard | Architecture Map | If a cron is expected to auto-close, the "Cerrada" state never appears automatically; this is acceptable for MVP scope |
| A6 | `bets.tokens_won` column is nullable integer, set by `resolve_pool` | Schema Design | If column is missing, win/loss badge display breaks |
| A7 | Parimutuel rounding loss (at most 1 ficha per winner) is acceptable | resolve_pool pattern | Confirmed acceptable by CONTEXT.md D-12 (zero-sum, Math.floor per CLAUDE.md) |

---

## Open Questions (RESOLVED)

1. **Initial odds seeding strategy**
   - What we know: Realtime delivers incremental INSERTs. On page load, we need current bet totals per option to seed the odds display.
   - What's unclear: Best approach — (a) a lightweight `get_bet_totals` aggregation RPC, (b) a DB view `pool_option_totals`, or (c) include `bet_count` and `tokens_total` columns in `pool_options` updated by a trigger.
   - Recommendation: Option (b) — a view `pool_option_totals` that groups bets by pool_id + option_id. Fetched once at page load; Realtime merges incremental INSERTs on top. No trigger complexity, no RPC needed.

2. **`resolve_pool` invocation in Phase 3**
   - What we know: CONTEXT.md D-08 says admin works via Supabase dashboard. `resolve_pool` is service-role only.
   - What's unclear: Does the admin know to open the SQL editor and call `SELECT resolve_pool(pool_id, option_id)` manually?
   - Recommendation: Document the SQL call clearly in the migration comment + add a commented example. Phase 4 admin UI will handle this properly.

3. **Pool `status='closed'` automation**
   - What we know: Phase 3 has no cron for pool closing. Admin sets it manually.
   - What's unclear: Should `place_bet` check `deadline < now()` and raise `pool_deadline_passed` even if `status='open'`?
   - Recommendation: YES — `place_bet` should check both `status='open'` AND `now() < deadline`. This ensures that even if the admin forgets to close a pool before the deadline, bets are rejected at the correct time. The `status` field then only needs manual update for UI display purposes (showing "Cerrada" badge).

---

## Environment Availability

No new external tools, services, or runtimes are required beyond what Phase 2 already uses. All dependencies are available.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project (live) | All DB operations | Assumed from Phase 2 completion | — | — |
| `@supabase/supabase-js` | Realtime + RPC | Yes | 2.107.0 | — |
| Supabase Realtime publication | Realtime events | Requires migration step | — | Add `alter publication supabase_realtime add table bets` to 0004 |
| `supabase` CLI | Migration push | Phase 2 used it | — | — |

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` (from config.json)

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (carried from Phase 1) | Supabase Auth — no new auth in this phase |
| V3 Session Management | No (carried from Phase 1) | No new session logic |
| V4 Access Control | **Yes** | SECURITY DEFINER functions for all token mutations; `revoke execute ... from authenticated` on `resolve_pool` |
| V5 Input Validation | **Yes** | `place_bet` validates pool status, option ownership, minimum bet, token sufficiency before any mutation |
| V6 Cryptography | No | No secrets or crypto in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized token self-payout (call resolve_pool as authenticated user) | Elevation of Privilege | `revoke execute on resolve_pool from authenticated` — service-role only |
| Race condition / double-spend on bet placement | Tampering | `SELECT FOR UPDATE` row lock on profile before balance check (CR-02 pattern) |
| Negative token balance via concurrent bets | Tampering | CHECK constraint `tokens >= 0` on profiles + FOR UPDATE lock |
| Duplicate bet placement (two browser tabs) | Tampering | UNIQUE constraint on `(user_id, pool_id)` — DB rejects at constraint level |
| Bet amount manipulation (send amount=1 instead of min 10) | Tampering | `place_bet` validates `p_amount >= 10`; frontend validation is UX-only |
| Cross-user bet data exposure | Information Disclosure | `bets` SELECT policy is permissive (required for Realtime); individual amounts visible via direct SELECT but no sensitive PII exposed; odds are public by design |
| Admin resolves pool with non-existent option_id | Tampering | `resolve_pool` references `pool_options(id)` FK; invalid option_id causes FK violation or zero payout (guard with explicit validation if needed) |
| Frontend pool_id or option_id spoofing | Tampering | `place_bet` validates `option_id` belongs to `pool_id`; spoofed IDs return `option_not_found` |

**Security note on the permissive `bets` SELECT policy:** This policy is required for Realtime to work (all authenticated users need SELECT to receive events). It exposes each user's `tokens_wagered` on any bet to any authenticated user who queries the table directly. This is acceptable because: (1) the token amounts are non-sensitive gamification tokens, (2) aggregate odds are explicitly public (D-04), and (3) it is consistent with how live sports betting odds work. Individual bet amounts are not shown in the frontend UI — only aggregated odds percentages.

---

## Sources

### Primary (HIGH confidence)

- [docs.supabase.com/guides/realtime/postgres-changes](https://supabase.com/docs/guides/realtime/postgres-changes) — channel filter syntax, ALTER PUBLICATION requirement, RLS policy requirement for Realtime events
- [docs.supabase.com/reference/javascript/removechannel](https://supabase.com/docs/reference/javascript/removechannel) — `removeChannel()` API signature and React cleanup pattern
- `supabase/migrations/0002_matches_predictions.sql` — SECURITY DEFINER function pattern, RLS structure, error-raising convention (project codebase)
- `supabase/migrations/0003_phase02_fixes.sql` — FOR UPDATE lock pattern (CR-02), leaderboard_view security_invoker fix (project codebase)
- `src/components/PredictionModal.tsx` — two-step modal pattern, error code mapping, updateTokens call placement (project codebase)
- `src/pages/CalendarPage.tsx` — page-level fetch pattern, optimistic state update, Realtime-compatible structure (project codebase)

### Secondary (MEDIUM confidence)

- [docs.supabase.com/guides/realtime/quotas](https://supabase.com/docs/guides/realtime/quotas) — free-tier: 200 concurrent connections, 2M messages/month
- [docs.supabase.com/guides/realtime/subscribing-to-database-changes](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) — ALTER PUBLICATION SQL syntax confirmed

### Tertiary (LOW confidence)

- None — all key claims are verified via official documentation or project codebase.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new packages; all verified in project package.json
- Database schema: HIGH (table structure) / ASSUMED (exact column names — Claude's discretion per CONTEXT.md)
- Realtime subscription: HIGH — verified via official Supabase docs
- `place_bet` function: HIGH (pattern) / ASSUMED (parameter names)
- `resolve_pool` function: HIGH (pattern) / ASSUMED (exact SQL)
- Parimutuel formula: HIGH — Math.floor on integer arithmetic; explicitly required by CLAUDE.md
- Pitfalls: HIGH — Pitfall 3 is directly evidenced by the CR-02 fix already in the codebase

**Research date:** 2026-06-06
**Valid until:** 2026-07-06 (Supabase Realtime API is stable; supabase-js v2 has been stable since 2022)
