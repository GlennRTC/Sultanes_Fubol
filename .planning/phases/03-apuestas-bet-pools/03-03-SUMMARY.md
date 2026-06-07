---
phase: 03-apuestas-bet-pools
plan: "03"
subsystem: frontend-apuestas
tags: [react, supabase-realtime, parimutuel-odds, bet-modal, pool-card]
dependency_graph:
  requires: [03-02]
  provides: [PoolCard, BetModal, ApuestasPage]
  affects: [src/components, src/pages]
tech_stack:
  added: []
  patterns:
    - Parimutuel odds calculation (calcOdds helper with division-by-zero guard)
    - Three-mode bet modal (editable two-step / read-only / closed notice)
    - Realtime odds update via supabase.channel + removeChannel cleanup
    - Optimistic bet badge injection (synthetic Bet in local state)
key_files:
  created:
    - src/components/PoolCard.tsx
    - src/components/BetModal.tsx
    - src/pages/ApuestasPage.tsx
  modified: []
decisions:
  - "Cast poolResult.data as unknown as BetPool[] — Supabase client type doesn't reflect bet_pools→pool_options join because the Database type has no Relationships declared for that table"
metrics:
  duration: ~8 minutes
  completed: 2026-06-07T14:49:46Z
  tasks_completed: 2
  files_created: 3
---

# Phase 03 Plan 03: Frontend Components (PoolCard, BetModal, ApuestasPage) Summary

**One-liner:** Three new React components completing the /apuestas user-facing feature — parimutuel odds pool cards, two-step bet modal wired to place_bet RPC, and an orchestrating page with parallel data fetch and Supabase Realtime subscription.

## What Was Built

### Task 1 — PoolCard.tsx and BetModal.tsx (commit c3e958b)

**PoolCard** (`src/components/PoolCard.tsx`)
- `calcOdds` helper: computes parimutuel percentages from `betTotals`; returns `null` for all options when `poolTotal === 0` (division-by-zero guard, Pitfall 4)
- `statusBadge` helper: returns styled `<span>` for `open/closed/resolved` status
- Renders: pool question, status badge + deadline/result row, options list with odds, bet badge
- Winning option highlighted with `border-green-500` / `text-green-400 font-bold` in resolved pools
- Bet badge covers all states: open/closed with bet ("Tu apuesta"), resolved win ("Ganaste"), resolved loss ("Perdiste")
- `role="button"` + `tabIndex={0}` + `onKeyDown` for Enter/Space (accessibility)

**BetModal** (`src/components/BetModal.tsx`)
- Three render modes: Mode A (read-only, user has bet), Mode B (closed/resolved, no bet), Mode C (editable two-step)
- Mode C Step 1: option selector buttons with live odds "(actual: N%)", token amount input (min 10), CTA disabled until valid
- Mode C Step 2: confirmation summary, calls `supabase.rpc('place_bet')`, Spanish error mapping for all five error codes
- `updateTokens(-amountNum)` called **only** in the `else` (success) branch — T-03-10 mitigated
- Escape key handler via `useEffect` (same pattern as PredictionModal)

### Task 2 — ApuestasPage.tsx (commit 8e07400)

- Parallel fetch: `bet_pools` (with `pool_options`), `bets`, `pool_option_totals` via `Promise.all`
- Error handling: pool fetch failure shows error banner; bet fetch failure is a console.warn (non-blocking)
- `betTotals` state built from `pool_option_totals` view: nested `Record<pool_id, Record<option_id, tokens_total>>`
- Supabase Realtime: `channel('bets-all')` subscribes to `bets INSERT` events; `setBetTotals` functional update preserves immutability; `removeChannel` in `useEffect` return (T-03-11 mitigated)
- `handleBetSuccess`: injects synthetic `Bet` with `id: 'local-' + Date.now()` for immediate badge update
- Derived arrays: `activePools` (open + closed), `closedPools` (resolved) — computed before render, not in state
- Cerradas section hidden when empty per UI-SPEC; empty state shown when no active pools
- `FullScreenSpinner` for initial load state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript cast for nested select result**
- **Found during:** Task 2 `npx tsc --noEmit`
- **Issue:** `supabase.from('bet_pools').select('*, pool_options(*)')` returns a type including `SelectQueryError<"could not find the relation between bet_pools and pool_options">` for the `pool_options` field because the `Database` type's `bet_pools` table has `Relationships: []` — no join relationship declared
- **Fix:** Added `as unknown as BetPool[]` cast with explanatory comment; the runtime data shape is correct since `pool_options(*)` succeeds at the API level when the FK exists in the actual DB
- **Files modified:** `src/pages/ApuestasPage.tsx` (line 36)
- **Commit:** 8e07400

## Known Stubs

None. All data sources are wired from the actual Supabase queries and Realtime subscription. No hardcoded empty values or placeholder text in rendered output.

## Threat Flags

No new security surface beyond what the plan's threat model covers. All three T-03-10, T-03-11, T-03-12 mitigations are implemented as specified.

## Self-Check

Files created:
- `src/components/PoolCard.tsx` — FOUND
- `src/components/BetModal.tsx` — FOUND
- `src/pages/ApuestasPage.tsx` — FOUND

Commits:
- `c3e958b` — feat(03-03): build PoolCard and BetModal components
- `8e07400` — feat(03-03): build ApuestasPage with parallel fetch and Realtime subscription

Verification:
- `removeChannel` appears in ApuestasPage.tsx: 1 occurrence
- `place_bet` appears in BetModal.tsx: 1 occurrence
- `updateTokens` in BetModal.tsx only in success branch (else of `if (rpcError)`)
- `pool_option_totals` appears in ApuestasPage.tsx: 2 occurrences
- TypeScript: `npx tsc --noEmit` passes with no errors

## Self-Check: PASSED
