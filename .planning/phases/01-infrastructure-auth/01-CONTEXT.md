# Phase 1: Infrastructure + Auth - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Provision the Supabase project, run all DB migrations (including the `profiles` table and RLS policies), deploy the app to Netlify on a public URL, and deliver working auth flows: register at `/registro`, log in at `/login`, log out from the navbar, and reset password via email link. Deploy the `ping` Edge Function and configure the cron-job.org job to prevent free-tier pause.

</domain>

<decisions>
## Implementation Decisions

### Auth Page Layout
- **D-01:** Login and register are separate routes: `/login` and `/registro` (not a tabbed single page).
- **D-02:** Unauthenticated visitors hitting any protected route are redirected to `/login`.
- **D-03:** Each page links to the other — `/login` shows "¿No tienes cuenta? Regístrate" → `/registro`, and vice versa.
- **D-04:** After a successful password reset, the user lands on `/login` with a success confirmation message (not auto-logged in).

### Username Capture
- **D-05:** Username is collected in the `/registro` form alongside email and password — 3 fields total. No post-signup "complete profile" step.
- **D-06:** `profiles.username` has a UNIQUE constraint — duplicate usernames are rejected at the DB level.
- **D-07:** After `supabase.auth.signUp()` succeeds, the frontend immediately INSERTs a row into `profiles` with the username (direct INSERT, no DB trigger).
- **D-08:** Username is locked after registration — users cannot change it. Admins can correct typos directly.

### Protected Route Behavior
- **D-09:** When a logged-out user is redirected to `/login`, the intended URL is stored in `location.state.from`. After login, the user is taken back to that URL.
- **D-10:** While the app resolves the auth session on page load (`onAuthStateChange`), show a full-screen spinner. This prevents a flash of the login page for authenticated users.
- **D-11:** Authenticated users who navigate to `/login` or `/registro` are automatically redirected to `/calendario`.

### Auth Header / App Shell
- **D-12:** The authenticated top navigation bar shows: "FUBOL" logo/title on the left; username + token balance ("Fichas: 0") + "Cerrar sesión" button on the right.
- **D-13:** Token balance is displayed in the header from Phase 1 (reads from `profiles.tokens`, defaults to 0). This establishes the pattern for Phases 2–4.
- **D-14:** After login in Phase 1, users land on a placeholder home page showing "Bienvenido, [username]". This route is replaced by the real calendar in Phase 2.

### Claude's Discretion
- Supabase client setup — singleton export from `src/lib/supabase.ts`.
- Auth state management — Zustand store structure for user session.
- Spanish error message mapping — custom error map over Supabase's English error strings.
- Netlify configuration — `netlify.toml`, `public/_redirects` for SPA routing.
- Ping Edge Function implementation details and cron-job.org setup steps.
- DB schema columns beyond username/tokens — `is_admin`, `is_blocked`, timestamps, etc.
- RLS policy definitions for the `profiles` table.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements & Constraints
- `.planning/REQUIREMENTS.md` — Full v1 requirements; Phase 1 covers AUTH-01–04, INF-01–03, INF-05–06
- `.planning/PROJECT.md` — Stack constraints (fixed), token model, key decisions, out-of-scope items

### Roadmap
- `.planning/ROADMAP.md` §Phase 1 — Goal, success criteria, and mode (MVP) for this phase

No external specs yet — this is the first phase. All decisions are captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — completely greenfield project. All patterns established fresh in Phase 1.

### Established Patterns
- All patterns set in Phase 1 become the baseline for Phases 2–4. The Supabase client singleton, Zustand auth store, ProtectedRoute wrapper, and TailwindCSS layout patterns established here will be reused across every subsequent phase.

### Integration Points
- Phase 2 will replace the placeholder home page with `/calendario` and extend the Navbar with navigation links.
- The `profiles.tokens` column displayed in Phase 1's header is written by SQL functions starting in Phase 3.

</code_context>

<specifics>
## Specific Ideas

- The header token balance should use the label "Fichas" (Spanish for tokens/chips).
- The placeholder post-login page should greet in Spanish: "Bienvenido, [username]".
- Logout button label: "Cerrar sesión".
- Register link text on /login: "¿No tienes cuenta? Regístrate".
- Login link text on /registro: "¿Ya tienes cuenta? Ingresa".

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Infrastructure + Auth*
*Context gathered: 2026-06-05*
