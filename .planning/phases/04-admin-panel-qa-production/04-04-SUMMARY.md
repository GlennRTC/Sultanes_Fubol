---
phase: 04-admin-panel-qa-production
plan: 04
subsystem: admin-ui
tags: [admin, pools, reports, rpc, leaderboard]
dependency_graph:
  requires: [04-01, 04-02, 04-03]
  provides: [admin-pools-page, admin-reports-page]
  affects: [src/pages/AdminPoolsPage.tsx, src/pages/AdminReportsPage.tsx]
tech_stack:
  added: []
  patterns: [SECURITY DEFINER RPC calls with Spanish error mapping, Promise.all parallel fetch, cast-via-unknown for Supabase join inference]
key_files:
  created: []
  modified:
    - src/pages/AdminPoolsPage.tsx
    - src/pages/AdminReportsPage.tsx
decisions:
  - cast-via-unknown used for Supabase select('*, pool_options(*)') because the Database type does not declare the bet_pools/pool_options FK relationship, causing SelectQueryError in the inferred type
  - token_transactions query failure is treated as non-blocking so partial data (profiles + leaderboard) still renders even if the admin SELECT policy is missing
metrics:
  duration: "3 minutes"
  completed: 2026-06-11
  tasks_completed: 2
  files_created: 0
  files_modified: 2
---

# Phase 4 Plan 4: AdminPoolsPage and AdminReportsPage Summary

Pool creation form + active-pool resolve UI (AdminPoolsPage) and token circulation stat cards + leaderboard table (AdminReportsPage) replacing the stubs from Plan 03.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AdminPoolsPage.tsx | c8291fe | src/pages/AdminPoolsPage.tsx |
| 2 | AdminReportsPage.tsx | c8291fe | src/pages/AdminReportsPage.tsx |

## What Was Built

### AdminPoolsPage.tsx

- **Section 1 — Crear Pool:** `<textarea>` for question, `<select>` for type (binary / multiple_exclusive), `datetime-local` input for deadline with "Hora local. Se guardará en UTC." note, dynamic option inputs (2–4 via addOption/removeOption helpers using Plus and Trash2 icons), and a submit button with Loader2 spinner while creating.
- On submit: validates nonEmpty options ≥ 2, question non-empty, deadline non-empty and future; converts datetime-local to UTC ISO string via `new Date(deadline).toISOString()`; calls `supabase.rpc('create_bet_pool', { p_question, p_type, p_deadline, p_options })`.
- On success: displays returned pool UUID in a green success banner, resets form, re-fetches pools.
- Spanish error mapping: `not_admin`, `invalid_pool_type`, `pool_needs_at_least_two_options`, `deadline_must_be_future`, plus fallback.
- **Section 2 — Pools Activos:** fetches `bet_pools` joined with `pool_options` where `status IN ('open', 'closed')` ordered by deadline. Per-pool card shows question, status badge (green "Abierta" / slate "Cerrada"), and deadline formatted via `formatInTimeZone` with `date-fns-tz` and `es` locale. Per-pool: `<select>` for winning option (sorted by position), "Resolver pool" button with Loader2 spinner.
- On resolve: calls `supabase.rpc('admin_resolve_pool', { p_pool_id, p_winning_option_id })`; on success shows success banner and re-fetches (resolved pool disappears since it leaves open/closed).
- Spanish error mapping: `not_admin`, `pool_not_open_or_not_found`, `winning_option_not_found`, plus fallback.

### AdminReportsPage.tsx

- **Parallel fetch via `Promise.all`:** `profiles.select('tokens, id')`, `token_transactions.select('amount, type').eq('type', 'admin_grant')`, `leaderboard_view.select('*').order('leaderboard_points', { ascending: false }).limit(50)`.
- **Stat card 1 — Fichas en circulación:** `SUM(profiles.tokens)` computed client-side from profiles data. Avoids Pitfall 5 — uses current balances, not transaction sums.
- **Stat card 2 — Total otorgadas por admin:** filters `admin_grant` rows with `amount > 0` and sums; if the admin SELECT policy on `token_transactions` is not active, shows '—' non-blocking.
- **Stat card 3 — Usuarios activos:** `COUNT(profiles WHERE tokens > 0)` computed client-side from profiles data.
- **Leaderboard table:** renders `leaderboard_view` rows with columns #, Usuario, Puntos, Fichas in `overflow-x-auto` wrapper following AdminUsersPage table pattern.

## Verification Results

| Check | Result | Expected |
|-------|--------|----------|
| `grep -c "create_bet_pool" AdminPoolsPage.tsx` | 1 | >=1 |
| `grep -c "admin_resolve_pool" AdminPoolsPage.tsx` | 1 | >=1 |
| `grep -c "AdminPoolsPage" AdminPoolsPage.tsx` | 1 | >=1 |
| `grep -c "AdminReportsPage" AdminReportsPage.tsx` | 1 | >=1 |
| `grep -c "token_transactions" AdminReportsPage.tsx` | 2 | >=1 |
| `grep -c "leaderboard_view" AdminReportsPage.tsx` | 1 | >=1 |
| `./node_modules/.bin/tsc --noEmit` | PASS | no errors |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Double cast required for Supabase join type inference**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `supabase.from('bet_pools').select('*, pool_options(*)')` returns a type with `pool_options: SelectQueryError<"could not find the relation between bet_pools and pool_options">` because the `Database` type in `src/types/index.ts` does not declare `Relationships` between `bet_pools` and `pool_options`. Direct cast to `(BetPool & { pool_options: PoolOption[] })[]` fails because `SelectQueryError` is not comparable to `PoolOption[]`.
- **Fix:** Changed cast to go via `unknown` first: `as unknown as (BetPool & { pool_options: PoolOption[] })[]`. This is the standard pattern for manually-maintained `Database` types without FK relationship declarations.
- **Files modified:** `src/pages/AdminPoolsPage.tsx` line 37
- **Commit:** c8291fe

## Known Stubs

None — both pages are fully implemented. The stubs from Plan 04-03 are replaced.

## Threat Flags

No new threat surface introduced beyond what was planned:
- T-04-18: Frontend validates deadline > now() before calling create_bet_pool; SQL function also validates server-side.
- T-04-19: admin_resolve_pool relies on pool status check inside the SQL function (pool must be 'open'); resolved pools leave the open/closed list so the UI naturally hides them.
- T-04-20: token_transactions fetch failure is treated as non-blocking ('—' shown for stat); non-admin gets 0 rows from RLS, not an error.
- T-04-21: p_options is passed as string array; no SQL injection risk.

## Self-Check: PASSED

- [x] `src/pages/AdminPoolsPage.tsx` — exists, exports `AdminPoolsPage`
- [x] `src/pages/AdminReportsPage.tsx` — exists, exports `AdminReportsPage`
- [x] Commit c8291fe — both files committed
- [x] TypeScript compiles cleanly (no output from tsc --noEmit)
