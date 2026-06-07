---
phase: 03-apuestas-bet-pools
fixed_at: 2026-06-07T00:00:00Z
review_path: .planning/phases/03-apuestas-bet-pools/03-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-06-07T00:00:00Z
**Source review:** .planning/phases/03-apuestas-bet-pools/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (2 Critical, 5 Warning; Info findings excluded per fix_scope)
- Fixed: 7
- Skipped: 0

---

## Fixed Issues

### CR-01: `resolve_pool` has no idempotency guard — double-call double-pays all winners

**Files modified:** `supabase/migrations/0004_bet_pools.sql`, `supabase/migrations/0005_bet_pools_security_fixes.sql`
**Commit:** 446df94
**Applied fix:** Added `v_current_status text` to the declare block, then at the top of `begin`: SELECT status into v_current_status WHERE id = p_pool_id; raise exception 'pool_not_found' if NOT FOUND; raise exception 'pool_already_resolved' if status is already 'resolved'. This prevents a second admin invocation from re-running the full payout loop. The fix is in 0004_bet_pools.sql (source of truth) and replicated in 0005_bet_pools_security_fixes.sql (live Supabase apply migration).

---

### CR-02: `resolve_pool` writes `winning_option_id` before validating the option belongs to the pool

**Files modified:** `supabase/migrations/0004_bet_pools.sql`, `supabase/migrations/0005_bet_pools_security_fixes.sql`
**Commit:** 446df94
**Applied fix:** Two-part fix. (1) Added an existence check using `NOT EXISTS (SELECT 1 FROM pool_options WHERE id = p_winning_option_id AND pool_id = p_pool_id)` before any writes, raising 'option_not_in_pool' on mismatch. (2) Added FK constraint `bet_pools_winning_option_id_fkey` in 0005_bet_pools_security_fixes.sql as database-level enforcement. The option check is step 1 in the function body (before the UPDATE to bet_pools), ensuring the pool row is never corrupted by an admin typo.

---

### WR-01: `bets` fetch failure silently clears the bets array

**Files modified:** `src/pages/ApuestasPage.tsx`
**Commit:** 5b68cfe
**Applied fix:** Replaced `console.warn` + fallthrough with an early-return that calls `setError('No se pudo cargar tu historial de apuestas. Recarga la página.')` and `setLoading(false)`. The page error state is rendered identically to `poolResult.error`, halting rendering of pool cards when bet history is unavailable, preventing the misleading editable-modal state.

---

### WR-02: No upper-bound validation on bet amount input

**Files modified:** `src/components/BetModal.tsx`
**Commit:** 24eb691
**Applied fix:** Added `amountNum <= (profile?.tokens ?? 0)` as a fourth condition in `canProceed`. Also destructures `profile` from `useAuthStore()` (the hook was already imported). Added `max={profile?.tokens ?? 0}` attribute to the `<input type="number">` element so the browser's native spinner and HTML5 validation both enforce the ceiling. This prevents PostgreSQL error 22003 (integer out of range) and enforces the token-balance ceiling at the UI layer.

---

### WR-03: `calcOdds` / `calcOddsInline` logic duplicated across BetModal and PoolCard

**Files modified:** `src/lib/calcOdds.ts` (new), `src/components/BetModal.tsx`, `src/components/PoolCard.tsx`
**Commit:** eab8a0b
**Applied fix:** Extracted the parimutuel percentage calculation to `src/lib/calcOdds.ts` with signature `calcOdds(options: { id: string }[], betTotals: Record<string, number>): Record<string, number | null>`. Both BetModal and PoolCard now import and call the shared utility. The local `calcOddsInline` function in BetModal and the local `calcOdds` function in PoolCard (which had an unused `_poolId: string` first parameter) are removed. PoolCard's call site updated from `calcOdds(pool.id, sortedOptions, betTotals)` to `calcOdds(sortedOptions, betTotals)`. PoolCard's now-unused `PoolOption` import also removed.

---

### WR-04: `place_bet` does not guard against `auth.uid()` returning `null`

**Files modified:** `supabase/migrations/0004_bet_pools.sql`, `supabase/migrations/0005_bet_pools_security_fixes.sql`
**Commit:** 446df94
**Applied fix:** Added null check immediately after `v_user_id uuid := auth.uid()` in the declare block: `IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;`. This is step 0 in the function body, before any pool validation or lock acquisition. Provides defense-in-depth — the primary mitigation remains `REVOKE EXECUTE ... FROM anon`. The fix is in 0004_bet_pools.sql (source of truth) and replicated in 0005_bet_pools_security_fixes.sql.

---

### WR-05: `App.tsx` ignores the error from the `profiles` fetch

**Files modified:** `src/App.tsx`
**Commit:** 28dabdb
**Applied fix:** Changed `const { data }` to `const { data, error: profileError }` on the Supabase profiles query. Added an `if (profileError)` branch that logs the error to console and calls `await supabase.auth.signOut()` then `return`. This prevents the authenticated-but-no-profile state where Navbar shows empty username and ApuestasPage operates with null profile context. Sign-out redirects to `/login` via the existing `onAuthStateChange` → `setUser(null)` → `ProtectedRoute` flow, allowing the user to retry cleanly.

---

## Skipped Issues

None — all 7 in-scope findings were successfully fixed.

---

_Fixed: 2026-06-07T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
