# Phase 1: Infrastructure + Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 1-Infrastructure + Auth
**Areas discussed:** Auth page layout, Username capture, Protected route behavior, Auth header / app shell

---

## Auth page layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single page, tabs | One route (e.g. /auth) with Login and Registro tabs. Simpler routing. | |
| Separate routes | /login and /registro as distinct pages. Cleaner URLs. | ✓ |
| You decide | Claude picks for MVP. | |

**User's choice:** Separate routes

| Option | Description | Selected |
|--------|-------------|----------|
| /login entry point | Visitors hitting protected routes redirected to /login. | ✓ |
| / landing page | Public landing page first with "Ingresar" button. | |

**User's choice:** /login as entry point

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — mutual links | Crosslinks between /login and /registro. | ✓ |
| No — closed registration | No public register link, admin sends invite URLs. | |

**User's choice:** Yes — mutual links

| Option | Description | Selected |
|--------|-------------|----------|
| /login with success message | After password reset, lands on /login with confirmation. | ✓ |
| Automatically logged in | Supabase logs them in directly after reset. | |

**User's choice:** /login with success message

---

## Username capture

| Option | Description | Selected |
|--------|-------------|----------|
| In the signup form | 3-field /registro form: username, email, password. | ✓ |
| Post-signup prompt | Separate "Complete tu perfil" screen after email/password signup. | |

**User's choice:** In the signup form

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, unique | UNIQUE constraint on profiles.username. | ✓ |
| No, duplicates allowed | Simpler signup but ambiguous leaderboard. | |

**User's choice:** Yes, unique constraint

| Option | Description | Selected |
|--------|-------------|----------|
| Direct INSERT from frontend | After signUp() succeeds, INSERT into profiles. | ✓ |
| DB trigger on auth.users | Trigger creates profiles row on auth.users insert. | |

**User's choice:** Direct INSERT from frontend

| Option | Description | Selected |
|--------|-------------|----------|
| No — locked after registration | Admin can fix typos. Leaderboard stays consistent. | ✓ |
| Yes — editable in profile settings | Adds a settings page to Phase 1 scope. | |

**User's choice:** Locked after registration

---

## Protected route behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — redirect back after login | Store intended URL in location.state.from. | ✓ |
| No — always land on fixed page | Always redirect to /calendario after login. | |

**User's choice:** Yes — remember and redirect back

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen spinner | Show centered spinner while onAuthStateChange resolves. | ✓ |
| Blank screen | Render nothing until auth resolves. | |
| You decide | Claude picks standard approach. | |

**User's choice:** Full-screen spinner

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — redirect to /calendario | Logged-in users visiting /login or /registro get redirected. | ✓ |
| No — show auth page anyway | Let logged-in users see auth pages if navigating there directly. | |

**User's choice:** Yes — redirect to /calendario

---

## Auth header / app shell

| Option | Description | Selected |
|--------|-------------|----------|
| App name + username + Salir button | "FUBOL" logo left; username, token balance, Cerrar sesión right. | ✓ |
| Full nav with links | Logo + links to Calendario, Quinielas, Apuestas (grayed out). | |
| Just a Salir button | Ultra-minimal for Phase 1. | |

**User's choice:** App name + username + Cerrar sesión (plus token balance, per D-13)

| Option | Description | Selected |
|--------|-------------|----------|
| "Bienvenido, [username]" placeholder | Confirms auth working. Phase 2 replaces it. | ✓ |
| /calendario route (empty state) | Build the route now with empty state. | |

**User's choice:** Bienvenido placeholder page

| Option | Description | Selected |
|--------|-------------|----------|
| Show token balance from Phase 1 | "Fichas: 0" in header. Sets pattern for all phases. | ✓ |
| Skip token display in Phase 1 | Add in Phase 3 when apuestas are live. | |

**User's choice:** Show token balance from Phase 1

---

## Claude's Discretion

- Supabase client singleton setup (`src/lib/supabase.ts`)
- Zustand store structure for auth session
- Spanish error message mapping (custom map over Supabase English errors)
- Netlify configuration (`netlify.toml`, `public/_redirects`)
- Ping Edge Function implementation and cron-job.org setup
- `profiles` table columns beyond username/tokens (`is_admin`, `is_blocked`, timestamps)
- RLS policy definitions for `profiles` table

## Deferred Ideas

None — discussion stayed within phase scope.
