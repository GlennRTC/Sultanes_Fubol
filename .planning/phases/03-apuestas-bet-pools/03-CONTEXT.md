# Phase 3: Apuestas (Bet Pools) - Context

**Gathered:** 2026-06-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the bet pools (apuestas) system. Authenticated users can browse open pools on `/apuestas`, see live parimutuel odds per option, and place a token bet (user-chosen amount, min 10 fichas) on one option per pool before the deadline. Pools are resolved by the admin; winners receive proportional token payouts with no house cut. The `/apuestas` page also serves as bet history — pools the user has bet on show a badge, resolved pools show win/loss inline. The DB layer introduces `bet_pools`, `pool_options`, `bets`, and `token_transactions` tables with full RLS and SECURITY DEFINER SQL functions for all token mutations. Phase 3 implements binary and multiple_exclusive pool types only; numeric_range is deferred. Admin pool creation is via Supabase dashboard only — the admin UI ships in Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Bet Amount Model
- **D-01:** Bets are user-chosen token amounts — the user types how many fichas to wager on an option. Not a fixed amount.
- **D-02:** Minimum bet: 10 fichas. Enforced at the DB level in `place_bet` SQL function.
- **D-03:** One bet per pool per user, locked on submit — no updates, no cancellations. APU-05 UNIQUE constraint on `(user_id, pool_id)` enforces this. Consistent with quiniela predictions.

### Pool Card + Odds Display
- **D-04:** Each pool card shows: pool question, each option with its current parimutuel percentage (e.g. "España 62%"), and the pool deadline. No total-tokens-wagered figure on the card.
- **D-05:** Odds update in real-time via Supabase Realtime channel subscription on the `bets` table. Free-tier Realtime supports this.
- **D-06:** After a user bets, the card shows a badge: "Tu apuesta: España · 150 fichas". Clicking the pool card opens a read-only modal (no re-bet allowed). Consistent with Phase 2 prediction card badges.

### Pool Types Scope
- **D-07:** Phase 3 implements two pool types only: `binary` (exactly 2 options) and `multiple_exclusive` (3–4 mutually exclusive options). The `type` column is an enum on `bet_pools`; numeric_range is deferred to Phase 4.
- **D-08:** Admin creates pools by inserting directly into the Supabase Table Editor or SQL editor. No frontend admin pool-creation UI in Phase 3 — that is ADM-05 in Phase 4.

### Bet History UX
- **D-09:** Bet history is embedded in the `/apuestas` pools page. No dedicated `/mis-apuestas` route. Each pool card shows the user's bet badge when they have one. The page renders all pools (open + resolved) in two sections: "Activas" and "Cerradas".
- **D-10:** Win outcome badge: "Ganaste: +320 fichas" (green). Loss outcome: "Perdiste" (slate/red muted). Both appear on the resolved pool card where the user had a bet.

### Tokenomics
- **D-11:** 500 fichas initial grant remains the admin-set default (carries forward from Phase 2 context D-13). Token name stays "fichas" — no rename.
- **D-12:** No house cut on pool payouts. All tokens wagered flow proportionally to winning bettors (APU-06). The token economy is zero-sum per pool: losers' tokens → winners.
- **D-13:** `token_transactions` table (TOK-02) is an internal audit log in Phase 3. No user-facing ledger page — that belongs in Phase 4 admin reporting. The table records every debit and credit: quiniela bets, quiniela payouts, pool bets, pool payouts, admin grants.

### Claude's Discretion
- DB schema details: column names, index definitions, trigger implementations beyond the tables named above.
- `place_bet` function internals: parameter names, exception codes, return type.
- `resolve_pool` function internals: payout calculation, rounding (Math.floor per CLAUDE.md).
- Pool card component structure and CSS — follow Phase 2 card + badge patterns.
- Supabase Realtime subscription implementation details (channel name scheme, filter expressions).
- Exact pool status enum values (e.g., `open`, `closed`, `resolved`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Constraints
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: APU-01–07, TOK-01–03; must cover all 10 REQ-IDs
- `.planning/PROJECT.md` — Stack constraints (fixed), token model rules (integer-only, Math.floor payouts, no frontend token mutations)
- `CLAUDE.md` — Security constraints: RLS on every table, SECURITY DEFINER for token mutations, tokens are integers (Math.floor on all payouts)

### Roadmap & Phase Context
- `.planning/ROADMAP.md §Phase 3` — Goal, success criteria, and mode (MVP) for this phase
- `.planning/phases/02-calendar-quinielas/02-CONTEXT.md` — Phase 2 decisions: token cost (D-10/D-11), Tailwind palette, modal pattern, Navbar token balance wiring

### Existing Code (must read before adding new code)
- `src/App.tsx` — Current route tree; Phase 3 adds `/apuestas` protected route
- `src/components/Navbar.tsx` — Current navbar; Phase 3 adds "Apuestas" NavLink
- `src/store/authStore.ts` — `updateTokens(delta)` for immediate Navbar balance updates after bet placement
- `src/types/index.ts` — Single types file; Phase 3 adds BetPool, PoolOption, Bet, TokenTransaction types here
- `src/components/PredictionModal.tsx` — Reference pattern for the bet placement modal (two-step confirm, error mapping, RPC call, updateTokens)
- `src/pages/CalendarPage.tsx` — Reference pattern for page-level data fetching, Realtime subscription handling, optimistic badge updates
- `supabase/migrations/0002_matches_predictions.sql` — Reference for SECURITY DEFINER function pattern, RLS policy structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PredictionModal` (`src/components/PredictionModal.tsx`) — two-step confirm pattern, error code → Spanish message mapping, `updateTokens` call before `onClose` (Pitfall 5). Bet placement modal follows this exact pattern.
- `MatchCard` (`src/components/MatchCard.tsx`) — badge rendering pattern ("Tu predicción: N-N"). Pool card bet badge follows the same approach.
- `FullScreenSpinner` — reuse for initial `/apuestas` data load.
- `useAuthStore` — `updateTokens(delta)` already handles the Navbar balance update. Call it after `place_bet` RPC succeeds.
- Supabase client (`src/lib/supabase.ts`) — singleton; also use `supabase.channel()` for Realtime odds subscription.

### Established Patterns
- **Tailwind palette:** `bg-slate-900` (page bg), `bg-slate-800` (card bg), `border-slate-700`, `text-green-400` (accent/win), `text-red-400` (loss), `text-slate-100/300/400` (text hierarchy)
- **Spanish copy everywhere:** all labels, badges, error messages, status text
- **Two-step modal confirm:** input step → confirm step (shows entered values) → RPC call
- **Optimistic badge update:** on RPC success, inject synthetic record into local state for immediate card update (see CalendarPage prediction badge pattern)
- **SECURITY DEFINER SQL functions** for all token mutations — never update tokens from the frontend directly

### Integration Points
- `App.tsx` route tree — add `<Route path="/apuestas" element={<ApuestasPage />} />` inside the ProtectedRoute layout
- `Navbar.tsx` — add "Apuestas" NavLink between "Calendario" and "Tabla" NavLinks
- `src/types/index.ts` — extend Database type with `bet_pools`, `pool_options`, `bets`, `token_transactions` tables; add BetPool, PoolOption, Bet, TokenTransaction app-level interfaces
- New migration `0004_bet_pools.sql` — all bet pool schema, RLS, and functions

</code_context>

<specifics>
## Specific Ideas

- Pool card "activas" section header with countdown or deadline label
- Resolved pool card shows the winning option highlighted (e.g. green border/background on the winner option)
- Win badge copy: "Ganaste: +320 fichas" (green text or chip)
- Loss badge copy: "Perdiste" (muted slate — no token amount shown since it was 0)
- Bet modal copy: "¿Cuántas fichas apuestas a [Opción]?" with number input, "Mín. 10 fichas", "Costo: [N] fichas" confirmation step
- Pool status labels: "Abierta" (accepting bets), "Cerrada" (deadline passed, awaiting resolution), "Resuelta" (winner declared)
- Navbar link label: "Apuestas"

</specifics>

<deferred>
## Deferred Ideas

- `numeric_range` pool type — deferred to Phase 4 alongside admin panel
- User-visible token transaction ledger (`/historial-fichas`) — deferred to Phase 4 admin reporting
- Admin pool creation frontend UI — deferred to Phase 4 (ADM-05)
- Increasing/modifying a bet after placement — explicitly excluded (one bet per pool, locked)

</deferred>

---

*Phase: 3-Apuestas (Bet Pools)*
*Context gathered: 2026-06-06*
