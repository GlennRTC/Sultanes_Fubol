# Phase 3: Apuestas (Bet Pools) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-06
**Phase:** 03-apuestas-bet-pools
**Areas discussed:** Bet amount model, Pool card + odds display, Pool types scope, Bet history UX, Tokenomics (including token naming)

---

## Bet Amount Model

| Option | Description | Selected |
|--------|-------------|----------|
| User-chosen amount | User types how many fichas to wager. More strategic — players can go big on conviction. | ✓ |
| Fixed amount like predictions | Every bet costs the same fixed number (e.g. 20 fichas). Simpler but removes strategic depth. | |

**Minimum bet question:**

| Option | Description | Selected |
|--------|-------------|----------|
| 10 fichas minimum | Low floor, accessible even with small balance | ✓ |
| 20 fichas minimum | Matches quiniela cost | |
| 50 fichas minimum | Meaningful commitment | |

**Re-bet question:**

| Option | Description | Selected |
|--------|-------------|----------|
| No — one bet per pool, locked on submit | Simple DB logic, consistent with predictions | ✓ |
| Yes — allow adding tokens to existing bet | More strategic but requires UPDATE path | |

---

## Pool Card + Odds Display

| Option | Description | Selected |
|--------|-------------|----------|
| Question + options with % odds + deadline | Clean and focused — no total wagered | ✓ |
| Question + options with % + total tokens wagered + deadline | Shows pool size ("3,200 fichas en juego") | |
| Question + options + deadline only (no odds until you bet) | Suspense mechanic, more complex UX | |

**Real-time odds question:**

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time via Supabase Realtime | Exciting, Polymarket-like feel | ✓ |
| On load only + manual refresh | Simpler, no subscription needed | |

**After-bet card question:**

| Option | Description | Selected |
|--------|-------------|----------|
| Badge showing their bet + read-only (like prediction badge) | Consistent with Phase 2 | ✓ |
| Greyed-out card with bet summary below | Dims the card, no modal | |

---

## Pool Types Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Binary + multiple_exclusive only | Covers 95% of WC scenarios; numeric_range deferred | ✓ |
| All 3 including numeric_range | More complete but adds complexity | |

**Admin pool creation question:**

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase dashboard only — no UI in Phase 3 | Keeps scope tight; admin UI in Phase 4 | ✓ |
| Basic admin pool creation form in Phase 3 | Gets admin off dashboard sooner | |

---

## Bet History UX

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded in the pools page | Badge on bet pools, resolved pools show win/loss inline | ✓ |
| Dedicated /mis-apuestas page | Cleaner history, adds a new route | |
| Profile page tab | Defers to Phase 4 | |

**Resolved pool win badge question:**

| Option | Description | Selected |
|--------|-------------|----------|
| Green badge: 'Ganaste: +320 fichas' | Clear outcome, shows tokens credited | ✓ |
| Badge with full breakdown: bet amount + return | More verbose | |

---

## Tokenomics

**Initial grant:** 500 fichas confirmed (carries forward from Phase 2).

**House cut question:**

| Option | Description | Selected |
|--------|-------------|----------|
| No house cut — zero-sum redistribution (per APU-06) | All tokens flow to winners | ✓ |
| Small house cut (e.g. 5%) | Deflates supply over time | |

**token_transactions visibility:**

| Option | Description | Selected |
|--------|-------------|----------|
| Internal/admin-only in Phase 3 | Keeps scope small; user ledger in Phase 4 | ✓ |
| Visible to users as /historial-fichas | Transparent but adds full page + query | |

**Token name:**

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 'Fichas' | Already in codebase; poker/casino chip connotation fits betting | ✓ |
| Monedas | Universal, warm | |
| Boletos | Event atmosphere | |
| Goles | Football-branded | |

---

## Claude's Discretion

- DB schema details (column names, indexes, triggers)
- `place_bet` and `resolve_pool` SQL function internals
- Pool card component structure and CSS
- Realtime subscription implementation details
- Pool status enum values

## Deferred Ideas

- `numeric_range` pool type → Phase 4
- User-visible token transaction ledger → Phase 4
- Admin pool creation frontend UI → Phase 4 (ADM-05)
- Modifying a bet after placement → explicitly excluded
