# Phase 4: Admin Panel, Mobile QA, and Production — Research

**Researched:** 2026-06-11
**Domain:** Supabase RLS + SECURITY DEFINER functions / Supabase Edge Functions (Deno) / React admin routing / Tailwind mobile QA
**Confidence:** HIGH (architecture decisions), MEDIUM (Edge Function admin pattern details)

---

## Summary

Phase 4 closes the gap between the current admin workaround (Supabase SQL Editor) and a production-ready admin UI. The core challenge is not building the UI — it is getting the database security model right for admin operations without violating the project's two hardest constraints: (1) service role key never touches the browser, and (2) tokens are only mutated via SECURITY DEFINER functions.

Five distinct security problems need new solutions in migration 0007:
- RLS on `profiles` currently blocks admins from listing all users (only `profiles_select_own` exists).
- `calculate_prediction_points` and `resolve_pool` are REVOKE'd from authenticated — admins cannot call them from the UI without a server-side relay.
- No `admin_logs` table exists for audit logging.
- No INSERT/UPDATE policies on `bet_pools` and `pool_options` prevent pool creation from the UI.
- `token_transactions` has no SELECT policy, blocking the token circulation report.

The recommended architecture puts admin-gated operations in new SECURITY DEFINER wrapper functions rather than granting elevated SQL functions to authenticated users. For password reset — the one operation that genuinely requires `auth.admin.generateLink()` (service role) — a Supabase Edge Function is the correct relay. This is the only Edge Function needed; everything else stays in SQL functions.

Mobile QA scope is well-defined: the group tabs row in CalendarPage (12 tabs, `overflow-x-auto`) and the MatchCard three-column grid are the highest-risk elements. The leaderboard table's fixed column widths and the Navbar hamburger menu already follow 44px tap-target minimums. No existing component has horizontal-overflow bugs except the tab row, which was intentionally designed with `overflow-x-auto` — this needs verification at 375px.

**Primary recommendation:** Write four new SECURITY DEFINER functions (`admin_set_match_result`, `admin_grant_tokens`, `admin_block_user`, `create_bet_pool`), one SECURITY INVOKER wrapper that can call `resolve_pool` under admin authorization, a `private.is_admin()` helper for RLS, and one Edge Function (`admin-reset-password`) for the password reset relay.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin identity check | Database (RLS + SECURITY DEFINER) | — | Must not trust client-supplied identity |
| User list / block / unblock | Database (SECURITY DEFINER fn) | Frontend (AdminUsersPage) | Token-adjacent; needs audit log inside transaction |
| Password reset relay | Edge Function (Deno, service role) | — | `auth.admin.generateLink` requires service role key; cannot be in browser |
| Match result entry + scoring | Database (SECURITY DEFINER fn) | Frontend (AdminMatchesPage) | Wraps existing `calculate_prediction_points` call under admin check |
| Pool creation | Database (SECURITY DEFINER fn) | Frontend (AdminPoolsPage) | Atomic: pool + options in one transaction |
| Pool resolution | Database (SECURITY DEFINER fn) | Frontend (AdminPoolsPage) | Wraps existing `resolve_pool` under admin check |
| Token grants | Database (SECURITY DEFINER fn) | Frontend (AdminUsersPage) | Tokens only via functions — CLAUDE.md hard constraint |
| Audit logging | Database (inside each SECURITY DEFINER fn) | — | INSERT inside the fn guarantees log cannot be spoofed |
| Token circulation report | Database (SELECT on token_transactions + profiles) | Frontend (AdminReportsPage) | New admin-only SELECT policy on token_transactions |
| Admin routing guard | Frontend (AdminRoute component) | — | Double-layer: UI check + DB functions enforce server-side |
| Mobile 375px layout | Frontend (CSS/Tailwind) | — | Pure presentation concern |
| RLS audit | Database (SQL verification queries) | — | Cannot be done from client SDK |

---

## Research Question Answers

### Q1: Admin Function Strategy — Internal Guard vs Wrapper Functions

**Decision: New SECURITY DEFINER wrapper functions with `is_admin` check inside.**

The two existing admin functions (`calculate_prediction_points`, `resolve_pool`) are currently REVOKE'd from `authenticated`. There are two options for making them callable from the admin UI:

**Option A:** Grant them back to `authenticated` and add an `is_admin` guard inside each.
- Risk: If the grant is ever misapplied or the guard is accidentally removed, any authenticated user can trigger payouts. The REVOKE was intentional (T-02-EOP, T-03-01 tags in comments) and reversing it increases attack surface.

**Option B (recommended):** Create new wrapper functions that call the existing functions internally.
- `admin_set_match_result(p_match_id, p_home_score, p_away_score)` — admin guard, then calls `calculate_prediction_points` logic directly (or re-implements the two steps: UPDATE matches + call scoring loop).
- The existing `calculate_prediction_points` stays REVOKE'd from authenticated. The wrapper is SECURITY DEFINER and also REVOKE'd from authenticated — then granted back to authenticated.
- The admin guard runs first: `if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then raise exception 'not_admin'; end if;`
- Audit INSERT happens inside the wrapper before returning.

**Why wrappers are cleaner:** They keep the existing service-role-only functions unchanged (no regression risk), create a clear audit trail in code, and centralize admin authorization in one place per operation. [CITED: existing migration comments T-02-EOP, T-03-01]

**Functions needed:**

| Function | Replaces workaround | REVOKE from | GRANT to |
|---|---|---|---|
| `admin_set_match_result(match_id, home, away)` | SQL Editor `calculate_prediction_points` call | public, anon | authenticated |
| `admin_grant_tokens(target_user_id, amount, note)` | Direct `UPDATE profiles.tokens` | public, anon | authenticated |
| `admin_block_user(target_user_id, blocked bool)` | Direct `UPDATE profiles.is_blocked` | public, anon | authenticated |
| `create_bet_pool(question, type, deadline, options[])` | Manual INSERT | public, anon | authenticated |
| `admin_resolve_pool(pool_id, winning_option_id)` | SQL Editor `resolve_pool` call | public, anon | authenticated |

All five: SECURITY DEFINER, `set search_path = public`, admin guard as first statement, audit INSERT before RETURN. [ASSUMED: the exact function signatures shown above — the underlying logic is verified from existing migrations]

---

### Q2: Password Reset for Admin — Email Discovery + Relay Strategy

**Decision: Edge Function `admin-reset-password` using `auth.admin.generateLink`.**

The problem has two parts: (a) profiles only store `username`, not `email`; (b) `auth.admin.generateLink({ type: 'recovery', email })` requires a service role key and cannot be called from the browser.

**Option A: Add `email` column to profiles (denormalized)**
- Every user's email becomes readable by the admin via the new admin SELECT policy.
- Requires maintaining sync between `auth.users.email` and `profiles.email` on email change.
- Adds denormalized data that must stay consistent forever.
- Allows the admin UI to look up email by username without a service role call.
- Still requires an Edge Function for the actual `auth.admin.generateLink` call.
- Not recommended — adds ongoing maintenance burden for a field that already exists in `auth.users`.

**Option B: Edge Function fetches email from auth.users (recommended)**
- Admin UI calls `supabase.functions.invoke('admin-reset-password', { body: { userId } })` passing the target user's UUID.
- Edge Function: validates caller JWT, checks `is_admin` on profiles, then uses service role client to call `supabase.auth.admin.generateLink({ type: 'recovery', email })` after first fetching the email from `auth.users` via `supabase.auth.admin.getUserById(userId)`.
- Service role key stays in Deno environment — never in browser. [CITED: CLAUDE.md "service role key never exposed to the frontend"]
- No denormalization, no sync problem.
- One Edge Function invocation per admin password reset — trivially within 500k/month free tier limit.
- Supabase improved cold starts to ~42ms average [CITED: supabase.com blog "Persistent Storage and 97% Faster Cold Starts"], so latency is acceptable for an infrequent admin action.

**Option C: Admin enters email manually**
- No Edge Function needed, but UX is poor and error-prone. Rejected.

**Edge Function pattern:** [ASSUMED: exact withSupabase import path — verify against Deno/Supabase Edge Function docs at deploy time]

```typescript
// supabase/functions/admin-reset-password/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // 1. Validate caller is authenticated
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  // 2. Validate caller is admin
  const { data: profile } = await anonClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return new Response('Forbidden', { status: 403 })

  // 3. Parse target user ID from request body
  const { userId } = await req.json()
  if (!userId) return new Response('Missing userId', { status: 400 })

  // 4. Use service role client to get email + generate reset link
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(userId)
  if (userError || !targetUser.user) return new Response('User not found', { status: 404 })

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: targetUser.user.email!,
    options: { redirectTo: `${Deno.env.get('SITE_URL') ?? ''}/restablecer-contrasena` }
  })
  if (linkError) return new Response(linkError.message, { status: 500 })

  // 5. Log the action (insert via service role client — bypasses RLS)
  await adminClient.from('admin_logs').insert({
    admin_id: user.id,
    action: 'password_reset_sent',
    target_user_id: userId,
    details: { email: targetUser.user.email }
  })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

[ASSUMED: `SITE_URL` env var name — set in Supabase Dashboard → Functions → Secrets before deploying]

---

### Q3: Admin RLS Design — Non-Recursive Profile Access

**Decision: `private.is_admin()` SECURITY DEFINER function, called as `(select private.is_admin())` in policies.**

The naive approach (`using (auth.uid() = id OR exists(select 1 from profiles where id = auth.uid() and is_admin))`) causes infinite recursion because the `exists(...)` sub-select evaluates the same RLS policy on `profiles` again. [CITED: Supabase RLS docs — security definer function pattern]

**Correct pattern:**

```sql
-- Step 1: Create helper in the 'private' schema (NOT public — never exposed via PostgREST API)
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public  -- prevents search path injection
stable                     -- tells planner this is read-only; enables per-statement caching
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_admin = true
  );
end;
$$;

-- No GRANT needed — the function is in 'private' schema and only called from SQL policies.
-- PostgREST never exposes functions in non-public schemas.

-- Step 2: Add admin SELECT policy on profiles
create policy "profiles_select_admin"
  on public.profiles
  for select
  using (
    auth.uid() = id  -- own row (existing policy covers this — but must combine or keep separate)
    or (select private.is_admin())  -- SELECT-wrapped for per-statement caching
  );
```

**Why the existing `profiles_select_own` policy is not enough:** The new policy must ALSO cover the admin case. Because Supabase RLS policies are OR'd together (a row is visible if ANY policy permits it), we can either:
- (a) Add a second SELECT policy `profiles_select_admin` with `using ((select private.is_admin()))` — simplest, policies OR together.
- (b) Replace the existing policy — more complex, not necessary.

**Recommended approach (a):** Add `profiles_select_admin` as a second SELECT policy. The existing `profiles_select_own` stays unchanged.

**Performance:** Wrapping in `(select private.is_admin())` triggers Postgres `initPlan` optimization — the function is evaluated once per statement, not once per row. [CITED: Supabase RLS docs — "99.94% faster" benchmark for this pattern]

**Admin UPDATE policy on profiles (for `is_blocked` via admin_block_user function):** The `admin_block_user` SECURITY DEFINER function runs with the function owner's privileges and bypasses RLS entirely — so no UPDATE policy on profiles is needed for admin operations via the function. Direct UPDATE from the frontend remains blocked by the existing `profiles_update_own` policy. [CITED: Supabase SECURITY DEFINER behavior]

---

### Q4: admin_logs Schema

**Decision: Standalone table with INSERT-only-from-functions policy.**

```sql
create table public.admin_logs (
  id              uuid        primary key default gen_random_uuid(),
  admin_id        uuid        not null references auth.users(id),
  action          text        not null,
  target_user_id  uuid        references auth.users(id),  -- nullable
  details         jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

alter table public.admin_logs enable row level security;

-- Admin can SELECT their own logs (for UI display if needed)
create policy "admin_logs_select_admin"
  on public.admin_logs for select
  using ((select private.is_admin()));

-- NO INSERT policy: all inserts happen inside SECURITY DEFINER functions only.
-- This prevents a malicious client from inserting fake log entries.
```

**Why no INSERT policy?** The security model for `admin_logs` is identical to `token_transactions`: legitimate writes only come from SECURITY DEFINER functions. If we add an INSERT policy with `with check (auth.uid() = admin_id)`, a client could insert arbitrary `action` values and fake audit entries. Functions own this table's write path entirely. [ASSUMED: this design — it follows the established pattern from `token_transactions` migration 0004]

**`action` values (initial set):**
- `match_result_entered`
- `tokens_granted`
- `tokens_removed`
- `user_blocked`
- `user_unblocked`
- `pool_created`
- `pool_resolved`
- `password_reset_sent` (written by Edge Function via service role client)

---

### Q5: Pool Creation from Frontend

**Decision: `create_bet_pool(question, type, deadline, options[])` SECURITY DEFINER function.**

**Option A:** INSERT policy on `bet_pools` and `pool_options` with admin check.
- Requires two separate INSERT policy grants + two separate client calls.
- The admin could INSERT a pool without any options (invalid state), or INSERT options for a pool that doesn't exist yet if the pool INSERT fails mid-flight.
- No audit log guarantee — INSERT policy doesn't let you also INSERT into `admin_logs`.

**Option B (recommended):** Single SECURITY DEFINER function that atomically creates pool + options in one transaction.
- Admin guard first.
- INSERT bet_pool, capture returned `id`.
- INSERT all pool_options with the new `pool_id`.
- INSERT into `admin_logs`.
- If any step fails, the entire transaction rolls back.
- Client makes one RPC call: `supabase.rpc('create_bet_pool', { ... })`.

```sql
create or replace function public.create_bet_pool(
  p_question  text,
  p_type      text,
  p_deadline  timestamptz,
  p_options   text[]      -- array of option labels in display order
)
returns uuid               -- returns the new pool's id
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id  uuid := auth.uid();
  v_pool_id   uuid;
  i           integer;
begin
  -- Admin guard
  if not exists (select 1 from public.profiles where id = v_admin_id and is_admin = true) then
    raise exception 'not_admin';
  end if;

  -- Validate type
  if p_type not in ('binary', 'multiple_exclusive') then
    raise exception 'invalid_pool_type';
  end if;

  -- Validate options count
  if array_length(p_options, 1) < 2 then
    raise exception 'pool_needs_at_least_two_options';
  end if;

  -- Create pool
  insert into public.bet_pools (question, type, deadline)
  values (p_question, p_type, p_deadline)
  returning id into v_pool_id;

  -- Create options (1-based position)
  for i in 1..array_length(p_options, 1) loop
    insert into public.pool_options (pool_id, label, position)
    values (v_pool_id, p_options[i], i);
  end loop;

  -- Audit log
  insert into public.admin_logs (admin_id, action, details)
  values (v_admin_id, 'pool_created', jsonb_build_object(
    'pool_id', v_pool_id,
    'question', p_question,
    'type', p_type,
    'deadline', p_deadline
  ));

  return v_pool_id;
end;
$$;

revoke execute on function public.create_bet_pool(text, text, timestamptz, text[]) from public, anon;
grant execute on function public.create_bet_pool(text, text, timestamptz, text[]) to authenticated;
```

[ASSUMED: exact function signature — the logic above follows patterns already established in existing migrations]

---

### Q6: resolve_pool from Admin UI

**Decision: New `admin_resolve_pool` SECURITY DEFINER wrapper, keeping existing `resolve_pool` as service-role-only.**

`resolve_pool` is currently REVOKE'd from authenticated. The options:

**Option A:** Grant `resolve_pool` to authenticated, add admin guard inside.
- Weakens the existing security boundary. `resolve_pool` touches token balances — keeping it inaccessible to authenticated role is the right default.

**Option B (recommended):** Create `admin_resolve_pool(pool_id, winning_option_id)` SECURITY DEFINER that:
1. Runs admin guard.
2. Calls the existing resolve pool logic directly (either via internal call or by re-implementing the UPDATE + payout loop — since SECURITY DEFINER functions can call other SECURITY DEFINER functions).
3. Inserts audit log.
4. Is REVOKE'd from public/anon, GRANT'd to authenticated.

Note: A SECURITY DEFINER function in PostgreSQL can call another SECURITY DEFINER function. The inner `resolve_pool` is REVOKE'd from authenticated but is callable from within a SECURITY DEFINER context because the outer function runs as the function owner (postgres/superuser), not as authenticated. This means `admin_resolve_pool` can call `resolve_pool` directly without granting it to authenticated. [ASSUMED: PostgreSQL SECURITY DEFINER call chain behavior — this is standard PostgreSQL but should be verified against a test migration]

If calling `resolve_pool` from within `admin_resolve_pool` doesn't work as expected (due to executor context), the fallback is to copy the resolve logic into `admin_resolve_pool` directly rather than calling the inner function.

---

### Q7: Mobile QA Scope — High-Risk Elements at 375px

**Confirmed risk areas (from code review):**

1. **CalendarPage group tab row** — 12 tabs (`GROUPS = ['A'...'L']`), rendered as `div.flex.gap-1.overflow-x-auto`. At 375px, 12 tabs × ~80px each = ~960px total width. The `overflow-x-auto` handles this by scrolling, but there may be visual clipping or the scroller may intercept vertical page scroll on iOS Safari. **Fix needed:** verify that `overflow-x-auto` does not cause `body` horizontal scroll; add `-webkit-overflow-scrolling: touch` behavior is automatic in modern iOS.

2. **CalendarPage filter bar** — two `<select>` elements with `flex-1 min-w-[140px]`. At 375px with `px-4` outer padding (32px consumed), usable width is 343px. Two elements at `min-w-[140px]` = 280px + gap = fits, but barely. Should verify no overflow at 375px. [CITED: code reading CalendarPage.tsx lines 191-214]

3. **MatchCard three-column grid** — `grid-cols-[1fr_68px_1fr]`. At 375px with `px-4` card padding: inner width = 375 - 32 (outer px-4) - 32 (card px-4) = 311px. Grid: 68px center + two 1fr columns = (311-68)/2 = 121.5px per team column. Long team names like "Estados Unidos" (13 chars) truncate via `truncate` class — this is intentional and correct. No overflow risk. [CITED: MatchCard.tsx lines 38-77]

4. **LeaderboardPage table** — uses fixed `w-8`, `w-20`, `w-20` columns with `flex-1` for username. At 375px with `px-4` padding: 375 - 32 = 343px inner. Fixed columns: 8 + 20 + 20 = 48px → remaining for username: 295px. Fine. [CITED: LeaderboardPage.tsx lines 73-78]

5. **Navbar** — already mobile-ready with hamburger at `< md`. Fichas badge + hamburger tested. Minimum tap target `min-h-[44px] min-w-[44px]` on hamburger. [CITED: Navbar.tsx lines 56-68] No changes needed.

6. **Admin pages (new)** — Must be designed mobile-first. User list table: needs consideration for small screens — consider using card-style rows instead of a table on mobile, or a table with truncated columns. The admin panel will likely only be used by the admin (one person) on desktop, but the `INF-04` requirement is app-wide.

**Specific fixes anticipated:**
- CalendarPage: Confirm `overflow-x-auto` on group tabs does not trigger body horizontal scroll. Add `shrink-0` to each tab button if needed.
- New admin pages: Use `overflow-x-auto` wrapper on any tables, `truncate` on long text cells.
- All tap targets: `min-h-[44px]` on interactive elements — follow established Navbar/modal patterns.

---

### Q8: RLS Audit Approach

**Systematic verification SQL for each table:**

```sql
-- Run each query as an authenticated test user (NOT from SQL Editor which bypasses RLS).
-- Use Supabase Studio's "impersonate user" feature or the JS client.

-- 1. profiles: user sees only own row; admin sees all
-- As user A: should return 1 row
SELECT count(*) FROM profiles;
-- As admin: should return N rows (all users)
SELECT count(*) FROM profiles;

-- 2. matches: all authenticated see all rows
SELECT count(*) FROM matches;  -- should equal total match count

-- 3. predictions: user sees only own predictions
SELECT count(*) FROM predictions;  -- should equal user's own prediction count
-- Cross-user check: should return 0
SELECT count(*) FROM predictions WHERE user_id != auth.uid();

-- 4. bet_pools: all authenticated see all pools
SELECT count(*) FROM bet_pools;

-- 5. pool_options: all authenticated see all options
SELECT count(*) FROM pool_options;

-- 6. bets: all authenticated see all bets (required for Realtime odds)
SELECT count(*) FROM bets;

-- 7. token_transactions: no SELECT policy yet (internal only)
-- As any user: should return error or 0 rows (RLS blocks)
SELECT count(*) FROM token_transactions;

-- 8. admin_logs: only admin sees logs
-- As regular user: should return 0
SELECT count(*) FROM admin_logs;

-- INSERT attempt verification (should all fail from client):
-- As any authenticated user, these should raise RLS violation errors:
INSERT INTO profiles (id, username) VALUES (auth.uid(), 'hacked');
UPDATE profiles SET tokens = 9999 WHERE id = auth.uid();
INSERT INTO matches (home_team, away_team, group_name, match_datetime) VALUES (...);
INSERT INTO admin_logs (admin_id, action) VALUES (auth.uid(), 'fake');
```

**Audit checklist per table:**

| Table | RLS Enabled | SELECT Policy | INSERT Policy | UPDATE Policy | Notes |
|-------|------------|--------------|--------------|--------------|-------|
| profiles | YES | own + admin (new) | own only | own only | admin writes via SECURITY DEFINER fns |
| matches | YES | authenticated | none | none | admin writes via admin_set_match_result fn |
| predictions | YES | own only | none | none | all writes via place_prediction fn |
| bet_pools | YES | authenticated | none | none | admin writes via create_bet_pool fn |
| pool_options | YES | authenticated | none | none | admin writes via create_bet_pool fn |
| bets | YES | authenticated | none | none | all writes via place_bet fn |
| token_transactions | YES | admin only (new) | none | none | all writes via SECURITY DEFINER fns |
| admin_logs | YES | admin only | none | none | all writes via SECURITY DEFINER fns + Edge Fn |

---

## Standard Stack

No new npm packages are needed for this phase. All implementation uses the existing stack.

### Core (existing, no additions)
| Library | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.107.0 | Client SDK — `supabase.rpc()`, `supabase.functions.invoke()` |
| react | ^18 | Admin page components |
| react-router-dom | ^6.30.4 | Admin routing, AdminRoute guard |
| zustand | ^4.5.7 | authStore — `profile.is_admin` check for AdminRoute |
| tailwindcss | ^3 | Admin UI styling, mobile QA fixes |
| lucide-react | ^1.17.0 | Icons in admin UI |

### Supabase Edge Function Runtime (Deno)
The `ping` function already establishes the Deno Edge Function pattern. The `admin-reset-password` function will follow the same `Deno.serve` structure.

---

## Package Legitimacy Audit

No new npm packages are introduced in this phase. Legitimacy gate: N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
Admin Browser (authenticated, is_admin=true)
    │
    ├─── AdminRoute (frontend guard: profile.is_admin check)
    │       └─── /admin/users, /admin/matches, /admin/pools, /admin/reports
    │
    ├─── supabase.rpc('admin_block_user', ...)
    ├─── supabase.rpc('admin_grant_tokens', ...)
    ├─── supabase.rpc('admin_set_match_result', ...)
    ├─── supabase.rpc('create_bet_pool', ...)
    ├─── supabase.rpc('admin_resolve_pool', ...)
    │       │
    │       ▼
    │   Supabase Database (PostgreSQL)
    │   SECURITY DEFINER functions:
    │   [1] admin guard: exists(select 1 from profiles where id=uid() and is_admin)
    │   [2] business logic (update matches / update profiles / etc.)
    │   [3] INSERT into admin_logs
    │
    └─── supabase.functions.invoke('admin-reset-password', { body: { userId } })
            │
            ▼
        Edge Function (Deno) — runs in Supabase cloud
        [1] validate caller JWT → anonClient.auth.getUser()
        [2] check is_admin on profiles
        [3] adminClient (service role) → auth.admin.getUserById(userId) → get email
        [4] adminClient → auth.admin.generateLink({ type: 'recovery', email })
        [5] adminClient → INSERT admin_logs
        [6] return { ok: true }
```

### Recommended Project Structure (new files)

```
src/
├── pages/
│   ├── AdminUsersPage.tsx       # ADM-01, ADM-02, ADM-03
│   ├── AdminMatchesPage.tsx     # ADM-04
│   ├── AdminPoolsPage.tsx       # ADM-05, ADM-06
│   └── AdminReportsPage.tsx     # ADM-07
├── components/
│   └── AdminRoute.tsx           # admin guard component (parallel to ProtectedRoute)
└── types/index.ts               # add AdminLog, AdminUser types here

supabase/
├── migrations/
│   └── 0007_admin_panel.sql    # all DB changes for this phase
└── functions/
    └── admin-reset-password/
        └── index.ts
```

### Pattern 1: Admin Route Guard Component

The `AdminRoute` component follows the same pattern as `ProtectedRoute` but checks `profile.is_admin`:

```typescript
// src/components/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FullScreenSpinner } from './FullScreenSpinner';

export function AdminRoute() {
  const { profile, loading } = useAuthStore();
  if (loading) return <FullScreenSpinner />;
  if (!profile?.is_admin) return <Navigate to="/calendario" replace />;
  return <Outlet />;
}
```

[CITED: src/components/ProtectedRoute.tsx — same structural pattern]

This is a UI convenience guard only. The real security is in the SECURITY DEFINER SQL functions. Do not rely on the frontend guard alone.

### Pattern 2: Admin RPC Call with Audit Log

All admin actions follow the same four-step client pattern:

```typescript
// Generic admin action pattern (example: block user)
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

async function handleBlockUser(userId: string, blocked: boolean) {
  setLoading(true);
  setError('');
  const { error: rpcError } = await supabase.rpc('admin_block_user', {
    p_target_user_id: userId,
    p_blocked: blocked,
  });
  if (rpcError) {
    setError(rpcError.message === 'not_admin'
      ? 'No tienes permisos de administrador.'
      : 'Error al actualizar usuario. Intenta de nuevo.');
  }
  setLoading(false);
}
```

Error messages from SECURITY DEFINER functions propagate as `rpcError.message` — map them to Spanish in the UI layer.

### Pattern 3: SECURITY DEFINER Function Template

Every admin SQL function follows this template:

```sql
create or replace function public.admin_XXX(...)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  -- 1. Auth check
  if v_admin_id is null then
    raise exception 'not_authenticated';
  end if;

  -- 2. Admin guard
  if not exists (
    select 1 from public.profiles
    where id = v_admin_id and is_admin = true
  ) then
    raise exception 'not_admin';
  end if;

  -- 3. Business logic (validate inputs, perform writes)
  ...

  -- 4. Audit log (last step before implicit commit)
  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (v_admin_id, 'action_name', <target_id_or_null>, jsonb_build_object(...));
end;
$$;

revoke execute on function public.admin_XXX(...) from public, anon;
grant execute on function public.admin_XXX(...) to authenticated;
```

[ASSUMED: based on patterns from migrations 0002 and 0004]

### Anti-Patterns to Avoid

- **Admin check in RLS only, not in functions:** RLS can be bypassed if the function is granted to authenticated and runs as SECURITY DEFINER. Always add the admin check as the first statement inside every admin function — don't rely solely on the RLS policy.
- **INSERT policy on admin_logs:** Never add one. Client-supplied audit log entries cannot be trusted. All writes must come from SECURITY DEFINER functions.
- **Calling `resolve_pool` by granting it to authenticated:** The existing service-role-only REVOKE was intentional (T-03-01 in migration comments). Use a new wrapper instead.
- **Denormalizing email into profiles:** Adds a sync problem that will break. Use the Edge Function to look up email from `auth.users` via service role.
- **Sharing the service role Supabase client instance with the frontend:** The Edge Function must create its own `adminClient` using `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env`. Never pass this key to the browser.
- **`profiles_select_admin` policy without SELECT wrapping:** Write `(select private.is_admin())` not `private.is_admin()`. Without SELECT wrapping, the function is called once per row instead of once per statement — catastrophic on a table with many users.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Admin identity verification in SQL | Custom JWT parsing in SQL | SECURITY DEFINER + `auth.uid()` | Supabase injects auth context into every SQL call; `auth.uid()` is the verified identity |
| Password reset for another user | Frontend workaround with anon key | `auth.admin.generateLink` in Edge Function (service role) | The admin API requires service role; there is no client-safe alternative |
| Token mutation from admin UI | `UPDATE profiles SET tokens = ...` from frontend | `admin_grant_tokens` SECURITY DEFINER function | CLAUDE.md hard constraint; also bypasses audit log |
| Recursive RLS for admin access | Inline `exists()` in RLS policy | `private.is_admin()` SECURITY DEFINER helper | Inline version causes infinite recursion on the profiles table itself |
| Pool creation as two separate SQL calls | INSERT bet_pool then INSERT options separately | `create_bet_pool(...)` function with atomic transaction | Risk of partial state (pool with no options) if second call fails |
| Custom email sending for password reset | Supabase SMTP + custom template | `auth.admin.generateLink` sends via Supabase's existing email config | Already configured in project; free tier email works |

---

## Common Pitfalls

### Pitfall 1: Recursive RLS on `profiles`

**What goes wrong:** Policy `using (exists(select 1 from profiles where id = auth.uid() and is_admin))` causes `ERROR: infinite recursion detected in policy for relation "profiles"` at runtime.

**Why it happens:** The policy itself reads `profiles`, which triggers the same policy, which reads `profiles` again — infinite loop.

**How to avoid:** The `private.is_admin()` SECURITY DEFINER function breaks the recursion because SECURITY DEFINER functions bypass RLS. The function reads `profiles` without hitting the RLS policy.

**Warning signs:** Any RLS policy on `profiles` that queries `profiles` inline (without going through a SECURITY DEFINER function) will exhibit this.

---

### Pitfall 2: SECURITY DEFINER Function in Public Schema is Callable via API

**What goes wrong:** A SECURITY DEFINER function in the `public` schema is exposed via PostgREST — any client with the anon key can call it via `POST /rest/v1/rpc/function_name`.

**Why it happens:** Supabase's PostgREST layer exposes all functions in the `public` schema by default.

**How to avoid:** The `private.is_admin()` helper goes in the `private` schema. The admin action functions (`admin_grant_tokens` etc.) stay in `public` but are protected by REVOKE/GRANT (`revoke from public, anon; grant to authenticated`). An authenticated user who calls them gets rejected by the admin guard inside the function.

**Warning signs:** Forgetting to `revoke execute ... from public, anon` after creating a function.

---

### Pitfall 3: CREATE OR REPLACE Preserves Old GRANTs

**What goes wrong:** `CREATE OR REPLACE FUNCTION` preserves existing grants. If you previously granted a function to `authenticated` and recreate it, the grant remains. If you then add a REVOKE, it works. But if you recreate the function without checking, a previously-revoked function might accidentally regain grants.

**Why it happens:** PostgreSQL `CREATE OR REPLACE` preserves the function's ACL (Access Control List).

**How to avoid:** Always include explicit `REVOKE ... FROM public, anon` and `GRANT ... TO authenticated` after every `CREATE OR REPLACE FUNCTION` in migrations — even when replacing an existing function. [CITED: migration 0005 which re-applies grants after CREATE OR REPLACE]

---

### Pitfall 4: Admin Route Guard Only Stops the UI, Not the API

**What goes wrong:** `AdminRoute` prevents non-admin users from seeing `/admin/*` routes in the browser. But a sophisticated user can still call `supabase.rpc('admin_grant_tokens', ...)` directly from the browser console.

**Why it happens:** The frontend guard is a UX convenience, not a security boundary.

**How to avoid:** Every admin SQL function must check `is_admin` internally as the first statement. The frontend AdminRoute guard is defense-in-depth only.

---

### Pitfall 5: Double-Counting Tokens in Reports

**What goes wrong:** The token circulation report sums `token_transactions.amount` but the `admin_grant` type has no `reference_id` — if you query `SUM(amount) GROUP BY type`, grants will be included in "in circulation" calculations incorrectly.

**Why it happens:** Tokens granted by admin are real tokens in circulation, but the report needs to distinguish "earned from gameplay" from "granted by admin."

**How to avoid:** Design the report SQL to separate `admin_grant` entries explicitly:

```sql
SELECT
  (SELECT SUM(tokens) FROM profiles) as total_in_circulation,
  (SELECT SUM(amount) FROM token_transactions WHERE type = 'admin_grant') as total_granted,
  (SELECT COUNT(*) FROM profiles WHERE tokens > 0) as active_users
```

---

### Pitfall 6: Edge Function Cold Start Delay for Password Reset

**What goes wrong:** The admin clicks "Reset Password" and nothing happens for 2-3 seconds — the UI appears broken.

**Why it happens:** Edge Functions have cold start latency. Supabase improved this to ~42ms average in 2025, but first invocations after idle periods can still take longer.

**How to avoid:** Show a loading spinner during the `supabase.functions.invoke` call. Display a success toast only after the response arrives. The admin panel is low-traffic so cold starts will occur; latency is acceptable for an infrequent admin action.

---

### Pitfall 7: admin_logs INSERT Fails Silently Inside Function

**What goes wrong:** The audit INSERT at the end of a SECURITY DEFINER function fails (e.g., `admin_logs` table doesn't exist yet, or a column type mismatch) and the whole transaction rolls back — but the admin sees a confusing error, not "action succeeded, log failed."

**Why it happens:** The audit INSERT is inside the same transaction as the business logic. Any exception rolls back everything.

**How to avoid:** Create the `admin_logs` table in migration 0007 BEFORE the function definitions that INSERT into it. Test the full function in local Supabase (`supabase start` + SQL Editor) before pushing to production.

---

### Pitfall 8: `calculate_prediction_points` Called Without Updating Match Status

**What goes wrong:** The admin enters a match result via `admin_set_match_result`, but the existing `calculate_prediction_points` function already does `UPDATE matches SET status = 'finished', home_score = ..., away_score = ...` internally. If `admin_set_match_result` also tries to UPDATE matches, there will be a double-write.

**Why it happens:** The existing `calculate_prediction_points` both updates the match row AND scores predictions in one function. The admin wrapper must account for this — either call the existing function and let it handle the match update, or update the match separately and call a scoring-only function.

**How to avoid:** `admin_set_match_result` should call the existing `calculate_prediction_points` logic internally (by calling the function as the function owner, which bypasses the service-role-only REVOKE). The match UPDATE only happens once, inside `calculate_prediction_points`. Do not add a separate UPDATE matches in `admin_set_match_result`.

---

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth JWT; AdminRoute guard |
| V3 Session Management | inherited from existing auth | No changes needed |
| V4 Access Control | yes (critical) | SECURITY DEFINER functions with admin guard; `private.is_admin()` RLS helper |
| V5 Input Validation | yes | SQL function parameter validation (type check, null check, range check) |
| V6 Cryptography | no | No new crypto; password reset uses Supabase's built-in flow |
| V7 Error Handling | yes | Mapped error messages in Spanish; no raw DB errors to browser |

### Known Threat Patterns for Admin Operations

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege escalation via `is_admin` self-update | Elevation of Privilege | `profiles_update_own` policy only allows updating own non-admin fields; `is_admin` updates require admin function |
| Log injection via fake admin_logs INSERT | Tampering | No INSERT policy on admin_logs; writes only via SECURITY DEFINER functions |
| Token inflation via direct `UPDATE profiles` | Tampering | No UPDATE policy for tokens column; only SECURITY DEFINER functions mutate tokens |
| Service role key exposure | Information Disclosure | Key lives only in Edge Function `Deno.env`; never returned to browser |
| Admin UI accessible to non-admin authenticated user | Elevation of Privilege | AdminRoute guard (UX) + admin guard in every SQL function (security) |
| JWT forgery to bypass admin check in Edge Function | Spoofing | `anonClient.auth.getUser()` validates JWT with Supabase's signing key; cannot be forged client-side |
| Replay of admin RPC calls | Repudiation | audit_logs records every action with timestamp and admin_id |
| Double-resolve pool (double payout) | Tampering | Existing CR-01 idempotency guard in `resolve_pool` — `admin_resolve_pool` wrapper inherits this |

---

## Wave Structure Validation

**Hypothesis validated with adjustments.** The proposed 4-wave structure is sound. Refinements:

### Wave 1 (Database Foundation)
**Migration 0007** — all DB changes in a single migration to avoid partial state:
1. `private` schema creation
2. `private.is_admin()` SECURITY DEFINER helper function
3. `admin_logs` table + RLS policies
4. `profiles_select_admin` RLS policy (add-only, existing `profiles_select_own` stays)
5. `token_transactions` admin SELECT policy
6. `admin_block_user(target_user_id, blocked)` function
7. `admin_grant_tokens(target_user_id, amount, note)` function
8. `admin_set_match_result(match_id, home_score, away_score)` function (calls `calculate_prediction_points` logic internally)
9. `create_bet_pool(question, type, deadline, options[])` function
10. `admin_resolve_pool(pool_id, winning_option_id)` function (calls `resolve_pool` logic internally)

**Schema push:** `supabase db push` to remote after local test.

### Wave 2 (Admin UI Structure + Users + Matches)
1. `AdminRoute.tsx` component
2. App.tsx wiring: `<Route element={<AdminRoute />}>` wrapping `/admin/*`
3. AdminUsersPage.tsx: user list with search, block/unblock, token grant, password reset button
4. AdminMatchesPage.tsx: match list filtered by status='scheduled'/'live', score entry form, submit button triggers `admin_set_match_result`
5. Edge Function `supabase/functions/admin-reset-password/index.ts`
6. Edge Function deploy: `supabase functions deploy admin-reset-password`
7. Navbar admin link (shown only when `profile?.is_admin`)

### Wave 3 (Pools + Reports)
1. AdminPoolsPage.tsx: create pool form + open pools list with resolve action
2. AdminReportsPage.tsx: token circulation totals + top predictors leaderboard
3. Add `AdminLog` and `AdminUser` types to `src/types/index.ts`

### Wave 4 (Mobile QA + RLS Audit)
1. 375px QA pass on all pages — test on real device or browser devtools responsive mode
2. Fix any mobile issues discovered (expected: CalendarPage group tabs scroll behavior)
3. RLS audit — run verification SQL queries as test users using Supabase Studio impersonation
4. Final manual smoke test: admin creates pool → regular user bets → admin resolves → payout appears

**Adjustment from hypothesis:** The Navbar admin link wiring moves to Wave 2 (not Wave 4) because it's a prerequisite for any admin UI navigation. App.tsx `/admin` routes also move to Wave 2 for the same reason.

---

## Decisions That Should Be Locked Before Planning

1. **SECURITY DEFINER wrapper functions (not granting existing service-role functions to authenticated):** This is the cleanest approach and avoids regressing the T-02-EOP / T-03-01 security decisions already made.

2. **Edge Function for password reset (not denormalized email on profiles):** One-time Edge Function deploy vs. ongoing data sync problem. Edge Function wins.

3. **`private.is_admin()` helper for all admin RLS:** Non-negotiable to avoid infinite recursion. Confirmed by Supabase official docs.

4. **No INSERT policy on `admin_logs`:** All writes must come from SECURITY DEFINER functions. Same model as `token_transactions`.

5. **`create_bet_pool` as an atomic function (not INSERT policy + two client calls):** Prevents partial state (pool without options).

6. **admin_resolve_pool calls resolve_pool logic internally (not re-grants):** The existing REVOKE was intentional and should not be reversed.

---

## Open Questions (RESOLVED)

1. **Can `admin_resolve_pool` call `resolve_pool()` directly?**
   - RESOLVED: Yes — a SECURITY DEFINER function runs as the function owner (postgres/superuser), which is not subject to REVOKE from authenticated. The inner `resolve_pool` is callable from within `admin_resolve_pool` without additional GRANT. Plan 01 implements this with a fallback instruction: if Supabase enforces the REVOKE differently, copy the resolve logic inline into `admin_resolve_pool` and add a comment.

2. **Does `supabase.functions.invoke` work when `verify_jwt` is the default (true)?**
   - RESOLVED: Yes — `supabase.functions.invoke` from the JS client automatically attaches the user's active session JWT in the Authorization header. Deploy `admin-reset-password` without `--no-verify-jwt` so Supabase validates the caller's JWT before the function body runs. This is the correct security posture for an admin-only function.

3. **Token circulation report: what does "circulation" mean for the admin?**
   - RESOLVED: Show three separate stat cards — (a) total fichas en circulación = `SUM(profiles.tokens)` across all users, (b) total fichas otorgadas = `SUM(amount) FROM token_transactions WHERE type = 'admin_grant'`, (c) usuarios activos = `COUNT(*) FROM profiles WHERE tokens > 0`. Implemented in Plan 04 AdminReportsPage.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration push (supabase db push) | Unknown — not in PATH during research | — | Use Supabase Dashboard SQL editor as fallback for migration |
| Deno | Edge Function local dev | Unknown | — | Deploy directly to Supabase cloud (no local test needed for simple function) |
| Node.js | Vite dev server | Unknown — not available in research env | — | Not needed for research; required for dev |
| Supabase project (remote) | Edge Function deploy | Assumed active (project was active in Phase 3) | — | — |

**Missing dependencies with no fallback:** None that block Phase 4 specifically — the migration can be applied via Supabase Dashboard SQL editor, and the Edge Function can be deployed via `supabase functions deploy` from a machine with Supabase CLI.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `admin_resolve_pool` can call `resolve_pool()` internally without additional GRANT | Q6, Wave 1 | If wrong: copy resolve logic inline into `admin_resolve_pool` — additional work but no design change |
| A2 | The `SITE_URL` env var name for the Edge Function redirectTo | Q2 Edge Function code | If wrong: use `APP_URL` or hardcode the production URL string — low risk |
| A3 | `admin_grant_tokens` with negative `amount` can handle token removal (Q ADM-03 says "add or remove") | Q1 | If wrong: need separate `admin_remove_tokens` function with different check logic |
| A4 | `auth.admin.generateLink` with `type: 'recovery'` sends the email automatically via Supabase's email config | Q2 | If wrong: must also call a send-email step separately — check Supabase docs at implementation time |
| A5 | The `private` schema does not exist yet in the project (no migration has created it) | Q3 | If wrong: `CREATE SCHEMA IF NOT EXISTS private` is safe and idempotent |

---

## Sources

### Primary (HIGH confidence)
- Supabase official docs (supabase.com/docs/guides/database/postgres/row-level-security) — SECURITY DEFINER function pattern for admin RLS, SELECT wrapping for performance
- Migration files 0001-0006 in supabase/migrations/ — verified existing DB schema, RLS policies, and function patterns
- src/components/ProtectedRoute.tsx — verified AdminRoute pattern to follow
- src/types/index.ts — verified existing types, confirmed no `email` field on Profile
- src/pages/*.tsx — verified mobile risk areas by reading actual code
- Supabase blog: "Persistent Storage and 97% Faster Cold Starts" — Edge Function cold start ~42ms

### Secondary (MEDIUM confidence)
- Supabase docs (supabase.com/docs/reference/javascript/auth-admin-generatelink) — `auth.admin.generateLink({ type: 'recovery', email })` API confirmed; service role requirement confirmed
- WebSearch result cross-referencing auth.admin namespace — service role key required for admin auth methods
- Supabase Edge Functions auth docs — JWT verification and `supabase.functions.invoke` pattern

### Tertiary (LOW confidence)
- PostgreSQL SECURITY DEFINER call chain behavior (A1) — standard PostgreSQL behavior but not tested against Supabase's specific enforcement

---

## Metadata

**Confidence breakdown:**
- Admin RLS design (private.is_admin helper): HIGH — confirmed by official Supabase docs
- SECURITY DEFINER wrapper function pattern: HIGH — matches exactly what existing migrations do for place_bet, place_prediction
- Edge Function for password reset: HIGH — only viable option given service-role-key constraint
- admin_resolve_pool calling resolve_pool internally: MEDIUM — standard PostgreSQL but flag A1
- Mobile QA risk areas: HIGH — identified by reading actual component code
- admin_logs schema design: HIGH — follows token_transactions precedent in same codebase
- Wave structure: HIGH — derived from dependency graph of what each wave needs

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (stable Supabase APIs; 30-day window)
