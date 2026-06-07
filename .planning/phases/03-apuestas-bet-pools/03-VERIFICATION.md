---
phase: 03-apuestas-bet-pools
status: pass
verified_at: 2026-06-06
plans: [03-01-PLAN.md, 03-02-PLAN.md, 03-03-PLAN.md, 03-04-PLAN.md]
---

# Phase 3 Plan Verification — PASS

All 4 plans verified against phase goal, success criteria, and security constraints.

## Coverage

| Requirement | Plans | Status |
|-------------|-------|--------|
| APU-01 (admin creates pool) | 01 | COVERED |
| APU-02 (view pools + live odds) | 01, 03, 04 | COVERED |
| APU-03 (bet before deadline) | 01, 03 | COVERED |
| APU-04 (insufficient tokens rejected) | 01, 03 | COVERED |
| APU-05 (duplicate bet rejected) | 01, 03 | COVERED |
| APU-06 (resolve pool, proportional payout) | 01, 03 | COVERED |
| APU-07 (bet history, win/loss badges) | 03, 04 | COVERED |
| TOK-01 (admin adds tokens) | 01 | COVERED |
| TOK-02 (every token movement recorded) | 01, 03 | COVERED |
| TOK-03 (balance never below 0) | 01 | COVERED |

## Security Checks

| Check | Status |
|-------|--------|
| RLS on all 4 new tables | PASS |
| place_bet SECURITY DEFINER + FOR UPDATE | PASS |
| resolve_pool revoked from authenticated | PASS |
| alter publication supabase_realtime add table bets | PASS |
| pool_option_totals view for initial odds seed | PASS |
| Math.floor on all payouts | PASS |
| No new npm packages | PASS |
| updateTokens only in success branch | PASS |

## Pitfall Mitigations (from RESEARCH.md)

| Pitfall | Plan | Mitigated |
|---------|------|-----------|
| P1: Table not in Realtime publication | 01 | alter publication supabase_realtime add table bets |
| P2: No SELECT RLS for Realtime | 01 | bets_select_authenticated permissive policy |
| P3: TOCTOU race on token deduction | 01 | FOR UPDATE lock before balance check (CR-02 pattern) |
| P4: Division by zero in odds display | 03 | calcOdds returns null when poolTotal === 0; displays "—" |
| P5: updateTokens on error path | 03 | updateTokens called only after error === null confirmed |
| P6: Zero winning bets on resolve | 01 | IF v_winning_total = 0 THEN RETURN guard |
| P7: Realtime channel not cleaned up | 03 | return () => supabase.removeChannel(channel) in useEffect |

## Deferred Scope (correctly absent)

- numeric_range pool type
- /historial-fichas ledger route
- Admin pool creation frontend UI (ADM-05)
- Bet modification/cancellation

## Warning (non-blocking, resolved)

RESEARCH.md "Open Questions" section heading renamed to "Open Questions (RESOLVED)" — all 3 questions answered inline and implemented in plans.
