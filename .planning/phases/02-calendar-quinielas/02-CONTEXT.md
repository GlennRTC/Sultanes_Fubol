# Phase 2: Calendar + Quinielas - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the match calendar and quinielas prediction system. An authenticated user can browse all 48 group-stage matches organized by date or by group, submit a score prediction with token deduction, and view the global leaderboard. The DB layer includes the `matches` and `predictions` tables, RLS policies, a `place_prediction` SQL function (atomic token deduction), a `calculate_prediction_points` SQL function (scoring engine), and the group-stage seed data. The frontend delivers `/calendario`, a prediction modal, and `/tabla` (leaderboard). The `/bienvenido` placeholder is replaced by `/calendario` as the post-login destination.

</domain>

<decisions>
## Implementation Decisions

### Calendar Layout (CalendarPage `/calendario`)
- **D-01:** Two views with a toggle — "Por fecha" (date-grouped scrollable list with date headers like "12 de junio") and "Por grupo" (tabbed A–L, each tab showing that group's 6 matches). [Corrected from A–H: WC 2026 has 12 groups A–L, 72 total matches — research finding overrides pre-planning assumption]
- **D-02:** Match card content: home team vs away team, match time in the user's local timezone, status badge (Programado / En vivo / Finalizado), and the actual score if the match is finished.
- **D-03:** In the "Por fecha" view, two dropdowns at the top — "Grupo:" and "Equipo:". Each has a "Todos" option to reset. Selecting a group filters to matches from that group; selecting a team shows only that team's matches.
- **D-04:** Match seed data is the real FIFA WC 2026 group-stage schedule (all 48 matches, real team names, UTC kickoff times). Built as `supabase/seed/matches_wc2026.sql`.

### Prediction UX (Prediction Modal)
- **D-05:** Clicking any match card opens a prediction modal. No page navigation — the calendar stays in context behind the modal.
- **D-06:** Modal contents: match name header + date/time, two number inputs (home score / away score), a token cost reminder ("Costo: 20 fichas"), and a "Confirmar predicción" button. If the user already has a prediction on this match, the modal shows it read-only (inputs disabled).
- **D-07:** Submission has a confirmation step before final commit: "¿Estás seguro? Esta predicción no se puede cambiar. Se descontarán 20 fichas." — then a final "Confirmar" button.
- **D-08:** On successful submission: modal closes, the match card updates to show a prediction badge ("Tu predicción: 2-1"), and the Navbar token balance updates immediately from the Zustand store.
- **D-09:** Locked matches (status = live or finished): card is still clickable. Modal opens read-only showing the user's prediction if they have one, or the message "Este partido ya comenzó — no se aceptan predicciones." Score inputs are disabled.

### Token Economics
- **D-10:** Each quiniela prediction costs 20 tokens (deducted immediately on submission via `place_prediction` SQL function).
- **D-11:** Payout: exact score = 3 pts + 30 tokens; correct winner/draw = 1 pt + 10 tokens; wrong = 0 pts + 0 tokens. Computed by `calculate_prediction_points` SQL function when admin enters result.
- **D-12:** Predictions are locked after first submission — no updates, no refunds. The confirmation step (D-07) is the sole safeguard.
- **D-13:** Default initial token balance for testing Phase 2: 500 tokens. Admin grants actual balances manually via the admin panel in Phase 4.

### Timezone Preference
- **D-14:** Timezone is auto-detected on page load via `Intl.DateTimeFormat().resolvedOptions().timeZone`. A small "Cambiar" link on the calendar page opens a minimal timezone picker.
- **D-15:** User-selected timezone is saved to `localStorage` (key: `fubol_timezone`). Persists across browser sessions on the same device. No DB column needed in this phase.
- **D-16:** The timezone picker offers ~15 options covering Latin America and Spain: México CST (America/Mexico_City), México CDT (America/Cancun), Colombia (America/Bogota), Perú (America/Lima), Ecuador (America/Guayaquil), Venezuela (America/Caracas), Chile (America/Santiago), Argentina/Uruguay (America/Argentina/Buenos_Aires), España (Europe/Madrid), and others as needed. Full IANA names used internally; display names in Spanish.

### Navbar & Routing Updates
- **D-17:** The Navbar gains two nav links: "Calendario" → `/calendario` and "Tabla" → `/tabla`. These appear between the brand and the user info section.
- **D-18:** The `/bienvenido` route and `HomePage` placeholder are replaced. `/` and `/bienvenido` both redirect to `/calendario`.
- **D-19:** Authenticated users who navigate to `/login` or `/registro` are redirected to `/calendario` (was `/bienvenido` in Phase 1 — update the D-11 redirect target).

### Phase 2 Scoring / Admin Access
- **D-20:** `calculate_prediction_points` is a PostgreSQL function that, given a `match_id`, `home_score`, and `away_score`, computes points and token credits for all predictions on that match and updates `predictions` and `profiles.tokens`. It is callable via Supabase RPC from an admin-privileged context. The admin UI to trigger it ships in Phase 4 — for Phase 2 testing, the function is invoked directly from the Supabase dashboard.

### Claude's Discretion
- DB schema details beyond columns named above (indexes, additional constraints, trigger definitions).
- `place_prediction` function internals (parameter names, exception handling, return type).
- Leaderboard query design (ranking by points, tie-breaking logic).
- Match card component structure and CSS beyond the patterns established in Phase 1.
- The exact list of timezone options (Claude fills out the 15-option list from the Latin America + Spain constraint).
- Supabase RLS policy definitions for `matches` and `predictions` tables.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Constraints
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: CAL-01–04, QUI-01–05; token model rules (TOK-02, TOK-03 apply here)
- `.planning/PROJECT.md` — Stack constraints (fixed), token model decisions, out-of-scope items
- `.planning/PROJECT.md §Key Decisions` — "Business logic in SQL functions" (place_bet / calculate_prediction_points must be atomic SQL, not frontend JS)

### Roadmap & Phase Context
- `.planning/ROADMAP.md §Phase 2` — Goal, success criteria, and mode (MVP) for this phase
- `.planning/phases/01-infrastructure-auth/01-CONTEXT.md` — Phase 1 decisions that carry forward (auth patterns, Zustand store, Navbar token balance display)

### Existing Code (must read before adding new code)
- `src/App.tsx` — Current route tree; Phase 2 adds /calendario and /tabla, updates redirects
- `src/components/Navbar.tsx` — Current navbar; Phase 2 adds nav links
- `src/store/authStore.ts` — Zustand auth store; Phase 2 may need a predictions/matches store or extend this
- `src/types/index.ts` — Single types file; Phase 2 adds Match, Prediction, LeaderboardEntry types here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FullScreenSpinner` (`src/components/FullScreenSpinner.tsx`) — reuse for calendar data loading state
- `Navbar` (`src/components/Navbar.tsx`) — extend with nav links; token balance already wired to Zustand
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) — wraps all Phase 2 routes unchanged
- `supabase` client (`src/lib/supabase.ts`) — singleton, reuse for all DB queries
- `useAuthStore` (`src/store/authStore.ts`) — provides `profile.tokens` for the Navbar balance display

### Established Patterns
- **Tailwind palette:** `bg-slate-900` (page bg), `bg-slate-800` (card/panel bg), `border-slate-700` (borders), `text-green-400` (token/accent), `text-slate-100`/`text-slate-300`/`text-slate-400` (text hierarchy)
- **Form pattern:** inputs with `bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:border-green-500 focus:ring-1 focus:ring-green-500`
- **Error alert pattern:** `bg-red-900/50 border border-red-700 rounded-lg px-4 py-3` with `role="alert"`
- **Loading spinner pattern:** `inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin`
- **All user-facing copy in Spanish** — teams, labels, error messages, status badges

### Integration Points
- `App.tsx` route tree — add `<Route path="/calendario" element={<CalendarPage />} />` and `<Route path="/tabla" element={<LeaderboardPage />} />` inside the ProtectedRoute layout
- `App.tsx` — update `<Navigate to="/bienvenido" replace />` to `<Navigate to="/calendario" replace />`
- `Navbar.tsx` — add nav links between brand span and user-info div
- `src/types/index.ts` — extend Database type with `matches` and `predictions` tables; add `Match`, `Prediction`, `LeaderboardEntry` interfaces

</code_context>

<specifics>
## Specific Ideas

- Match status badge labels: "Programado" (scheduled), "En vivo" (live), "Finalizado" (finished)
- Timezone picker trigger label on the calendar page: small "Cambiar" link next to the displayed timezone (e.g., "Zona: Ciudad de México · Cambiar")
- Prediction badge on match card after submission: "Tu predicción: 2-1" in a small green/slate chip
- Leaderboard page (`/tabla`) header: "Tabla de posiciones"
- Confirmation step copy: "¿Estás seguro? Esta predicción no se puede cambiar. Se descontarán 20 fichas."
- Token cost reminder inside modal: "Costo: 20 fichas"
- Locked-match message in read-only modal: "Este partido ya comenzó — no se aceptan predicciones."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Calendar + Quinielas*
*Context gathered: 2026-06-05*
