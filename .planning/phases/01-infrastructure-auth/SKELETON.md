# Walking Skeleton — FUBOL

**Phase:** 1
**Generated:** 2026-06-05

## Capability Proven End-to-End

A user can open the deployed app, register with username + email + password, log in, see their username and token balance ("Fichas: 0") read live from the Supabase `profiles` table in the navbar, and log out — all on the public Netlify URL without touching a console.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | Fixed stack constraint (CLAUDE.md); Vite gives fast dev + static `dist/` for Netlify free tier |
| Routing | React Router v6 with `<ProtectedRoute>` + `<Outlet>` layout nesting | Fixed stack; nested layout route renders Navbar only inside protected area |
| Data layer | Supabase PostgreSQL, accessed via `@supabase/supabase-js` singleton in `src/lib/supabase.ts` | Fixed stack; singleton prevents multiple client instances; RLS enforced on every table |
| Auth | Supabase Auth (email/password), session persisted by the SDK, surfaced via `onAuthStateChange` into a Zustand store | Fixed stack; `loading: true` on mount prevents login-page flash (D-10) |
| State | Zustand module-level singleton store `src/store/authStore.ts` (`user`, `profile`, `loading`) | Fixed stack; no React Context provider needed |
| Token mutations | SQL-only — frontend never writes `profiles.tokens`; column reads default 0 in Phase 1 | Security constraint (CLAUDE.md); SQL functions arrive in Phase 3 |
| Deployment target | Netlify static site, SPA catch-all redirect via `netlify.toml` | Fixed stack; free tier; `netlify.toml` is the single redirect source (no `public/_redirects`) |
| Anti-pause | `ping` Supabase Edge Function (Deno) called by cron-job.org every 3 days | Free-tier Supabase pauses on inactivity; ping is first deploy (Init decision) |
| Directory layout | `src/lib`, `src/store`, `src/components`, `src/pages`, `src/types/index.ts` (single types file), `supabase/migrations`, `supabase/functions/ping` | Single types file is a fixed constraint; flat feature-less layout suits a 4-phase app |
| Types source of truth | `src/types/index.ts` — single file: `Database` shape + app domain types | Fixed constraint: no per-feature type files |

## Stack Touched in Phase 1

- [x] Project scaffold (Vite + React + TS + Tailwind + Zustand + React Router, lint, typecheck)
- [x] Routing — `/login`, `/registro`, `/restablecer-contrasena`, protected `/bienvenido`, `/` redirect
- [x] Database — real READ (`profiles` row by id in `onAuthStateChange`) AND real WRITE (`profiles` INSERT on registration)
- [x] UI — interactive auth forms wired to Supabase Auth + navbar reading live profile
- [x] Deployment — live on public Netlify URL

## Out of Scope (Deferred to Later Slices)

- Match calendar, quinielas, predictions (Phase 2)
- Bet pools, parimutuel odds, token SQL functions, `token_transactions` (Phase 3)
- Admin panel, `admin_logs`, match-result entry, RLS full audit at 375px (Phase 4)
- Username change UI (D-08: locked after registration; admin corrects directly)
- Email confirmation toggle / custom SMTP (use Supabase defaults in Phase 1)
- Icon library, shadcn (declined for Phase 1 per UI-SPEC; revisit Phase 4)
- football-data.org API sync (seed SQL + later phases)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Authenticated user browses 48 group-stage matches in local timezone, submits a score prediction with token deduction, sees leaderboard update.
- Phase 3: Authenticated user views open bet pools with live parimutuel odds, bets tokens on one option, receives proportional winnings on resolution.
- Phase 4: Admin manages users/results/pools/tokens through a protected admin UI; mobile QA at 375px; full RLS audit.
