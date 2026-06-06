---
phase: 01-infrastructure-auth
verified: 2026-06-05T00:00:00Z
status: human_needed
score: 12/13 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "Supabase daily backups are confirmed enabled"
    reason: "INF-06 is not available on the Supabase free tier. Developer accepted this risk explicitly. Periodic manual exports are the mitigation. Will revisit if project upgrades to a paid tier."
    accepted_by: "Glenn Tomassi"
    accepted_at: "2026-06-06T00:00:00Z"
human_verification:
  - test: "Register at /registro on the live URL, then confirm a profiles row exists in the Supabase Table Editor with correct username and tokens = 0"
    expected: "Supabase Table Editor shows a row with id matching the auth.users id, username as entered, tokens = 0, is_admin = false, is_blocked = false"
    why_human: "Cannot query the live Supabase DB from a static grep. Developer confirmed this worked on local dev but live production URL end-to-end needs explicit confirmation."
  - test: "Log in on the live Netlify URL (https://sultanesdelfubol.netlify.app) and confirm the Navbar shows username and Fichas: 0"
    expected: "Authenticated session on the live URL populates the navbar with the real username and token balance from the profiles table"
    why_human: "Production auth flow requires a live Supabase session; cannot assert via grep."
  - test: "Try registering with a duplicate username on the live URL and confirm the exact error message appears"
    expected: "Error banner shows: 'Este nombre de usuario ya está en uso. Elige otro.'"
    why_human: "Requires a live DB call triggering the 23505 PostgreSQL constraint."
  - test: "Request a password reset on the live URL, receive the email, follow the link, set a new password, and confirm login works"
    expected: "Reset email arrives, new password is accepted, and user can log in again — navigating to /bienvenido with navbar visible"
    why_human: "Requires live email delivery from Supabase Auth and an interactive browser flow."
---

# Phase 1: Infrastructure + Auth Verification Report

**Phase Goal:** Supabase project is fully provisioned, all DB migrations are run, the app is live on Netlify, and a user can register, log in, and log out on the public URL.
**Verified:** 2026-06-05
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The dev server builds and typechecks with zero errors | VERIFIED | npm run build and typecheck pass per commits f26d43b, 8df287c, a3d9699, 236fe18; no TS errors found in source review |
| 2 | The profiles table exists in the live Supabase database with username UNIQUE and tokens defaulting to 0 | VERIFIED | Migration 0001_profiles.sql confirmed in codebase; developer confirmed `supabase db push` applied to project pajowyfyvdscyqebbhkv; migration contains `username text not null unique` and `tokens integer not null default 0 check (tokens >= 0)` |
| 3 | Row Level Security is enabled on profiles and a user can only read/update their own row | VERIFIED | Migration contains `alter table public.profiles enable row level security` with three policies all scoped to `auth.uid() = id`; no policy exposes other rows |
| 4 | On page load the app subscribes to onAuthStateChange and stores the resolved session in the Zustand store | VERIFIED | App.tsx lines 17-37: useEffect with `supabase.auth.onAuthStateChange`, setUser/setProfile on session, setLoading(false) always called, returns `subscription.unsubscribe()` for cleanup |
| 5 | An authenticated user's username and token balance are read live from profiles, not hardcoded | VERIFIED | App.tsx lines 22-26: fetches `from('profiles').select('*').eq('id', session.user.id).single()` then setProfile(data); Navbar renders `profile?.tokens ?? 0`; HomePage renders `profile?.username` |
| 6 | A user can register at /registro with username + email + password and a profiles row is created | VERIFIED (code) / UNCERTAIN (live) | RegistroPage: signUp then INSERT into profiles with id/username/tokens:0/is_admin:false/is_blocked:false confirmed in code; live DB INSERT requires human confirmation |
| 7 | A duplicate username is rejected with a Spanish error | VERIFIED (code) / UNCERTAIN (live) | RegistroPage line 100: `profileError.code === '23505'` maps to 'Este nombre de usuario ya está en uso. Elige otro.' |
| 8 | A user can log in at /login and is taken to their intended URL or /bienvenido | VERIFIED | LoginPage: signInWithPassword, redirects to `location.state?.from?.pathname ?? '/bienvenido'` replace |
| 9 | A user can log out from the navbar with the 'Cerrar sesion' button | VERIFIED | Navbar: `<button onClick={signOut}>Cerrar sesión</button>` wired to Zustand signOut which calls supabase.auth.signOut() and clears user+profile |
| 10 | A user can request a password-reset email and sees a success message | VERIFIED (code) | ResetPasswordPage: resetPasswordForEmail with redirectTo /login, two-state toggle to 'Revisa tu correo' heading; email delivery requires human verification |
| 11 | A logged-out user hitting a protected route is redirected to /login | VERIFIED | ProtectedRoute: `if (!user) return <Navigate to="/login" state={{ from: location }} replace />`; wired in App.tsx under /bienvenido |
| 12 | The app is live on a public Netlify URL with SPA deep-link routing working | VERIFIED | netlify.toml has `publish = "dist"` and `/* -> /index.html status 200`; public/_redirects absent; developer confirmed https://sultanesdelfubol.netlify.app is live |
| 13 | The ping Edge Function is deployed and returns 200 without an auth token | VERIFIED | supabase/functions/ping/index.ts uses `Deno.serve`, returns `{ok:true,ts:...}`, no Supabase client, no secrets; developer confirmed deployed at https://pajowyfyvdscyqebbhkv.supabase.co/functions/v1/ping with --no-verify-jwt and cron-job.org job configured |

**Score:** 12/13 truths verified (1 truth — INF-06 backups — overridden as accepted risk; 4 auth behaviors need live human confirmation for full closure)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/supabase.ts` | Typed Supabase client singleton | VERIFIED | createClient called once with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY; no service role key |
| `src/types/index.ts` | Database shape + Profile/AuthUser domain types | VERIFIED | Exports Database, Profile, AuthUser; is the only file under src/types/ |
| `src/store/authStore.ts` | Zustand auth store with user/profile/loading and signOut | VERIFIED | useAuthStore exported; loading: true initial; signOut clears user+profile |
| `supabase/migrations/0001_profiles.sql` | profiles table + RLS policies | VERIFIED | Contains create table, enable row level security, three owner-scoped policies |
| `src/pages/HomePage.tsx` | Placeholder welcome page reading profile from store | VERIFIED | Renders `Bienvenido, {profile?.username}` from useAuthStore |
| `src/components/ProtectedRoute.tsx` | Auth guard wrapping protected routes | VERIFIED | Contains Navigate, reads user/loading from store, state.from on redirect |
| `src/pages/LoginPage.tsx` | Login form + Spanish error mapping | VERIFIED | Contains signInWithPassword, mapError, crosslinks |
| `src/pages/RegistroPage.tsx` | Register form + profiles INSERT | VERIFIED | Contains signUp, from('profiles').insert, 23505 detection |
| `src/pages/ResetPasswordPage.tsx` | Password reset request + confirmation | VERIFIED | Contains resetPasswordForEmail, two-state UI |
| `src/components/Navbar.tsx` | Authenticated navbar with logout | VERIFIED | Contains 'Cerrar sesi' (full: 'Cerrar sesión'), signOut wired |
| `netlify.toml` | Netlify build config + SPA catch-all redirect | VERIFIED | publish = "dist", status = 200 catch-all present |
| `supabase/functions/ping/index.ts` | Stateless Deno ping Edge Function | VERIFIED | Uses Deno.serve, returns 200 JSON, no secrets |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/App.tsx` | `supabase.auth.onAuthStateChange` | useEffect subscription populating the store | WIRED | Lines 17-37: subscription setup, setUser/setProfile/setLoading called, cleanup via unsubscribe |
| `src/store/authStore.ts` | `profiles` table | select profile row by session user id | WIRED | App.tsx calls `from('profiles').select('*').eq('id', session.user.id).single()` after session resolves |
| `src/pages/RegistroPage.tsx` | `profiles` | INSERT after signUp succeeds | WIRED | Lines 89-97: insert with id/username/tokens:0/is_admin:false/is_blocked:false |
| `src/components/ProtectedRoute.tsx` | `/login` | Navigate with state.from when no user | WIRED | Line 14: `<Navigate to="/login" state={{ from: location }} replace />` |
| `src/components/Navbar.tsx` | `authStore.signOut` | onClick handler | WIRED | Line 19: `onClick={signOut}` |
| `netlify.toml` | `/index.html` | SPA catch-all redirect status 200 | WIRED | `from = "/*"`, `to = "/index.html"`, `status = 200` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `src/components/Navbar.tsx` | `profile.tokens`, `profile.username` | App.tsx onAuthStateChange -> supabase from('profiles') -> setProfile | Yes — DB query on every session event | FLOWING |
| `src/pages/HomePage.tsx` | `profile.username` | Zustand store populated by App.tsx onAuthStateChange | Yes — store populated from live profiles fetch | FLOWING |
| `src/pages/LoginPage.tsx` | `user` (auth redirect guard) | Zustand store via useAuthStore | Yes — populated by onAuthStateChange | FLOWING |
| `src/pages/RegistroPage.tsx` | INSERT into profiles | supabase.from('profiles').insert | Yes — real DB write | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| netlify.toml has SPA catch-all | `grep -q 'status = 200' /d/sultanes_fubol/Sultanes_Fubol/netlify.toml` | exit 0 | PASS |
| public/_redirects absent | `test -f public/_redirects` | ABSENT | PASS |
| ping function uses Deno.serve | `grep -q "Deno.serve" /d/sultanes_fubol/Sultanes_Fubol/supabase/functions/ping/index.ts` | exit 0 | PASS |
| profiles migration has RLS | `grep -q "enable row level security" .../0001_profiles.sql` | exit 0 | PASS |
| No service role key in frontend | grep across src/ | no output | PASS |
| No TBD/FIXME/XXX debt markers | grep across src/ and supabase/ | no output | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 01-02 | User can register with username + email + password | SATISFIED | RegistroPage: signUp + profiles INSERT; 23505 duplicate detection |
| AUTH-02 | 01-01, 01-02 | User can log in and stay logged in across sessions | SATISFIED | LoginPage: signInWithPassword; onAuthStateChange persists session across page loads |
| AUTH-03 | 01-02 | User can log out from any page | SATISFIED | Navbar: Cerrar sesion button wired to signOut; signOut calls supabase.auth.signOut() |
| AUTH-04 | 01-02 | User can reset password via email link | SATISFIED (code) | ResetPasswordPage: resetPasswordForEmail + redirectTo /login; email delivery needs human confirm |
| INF-01 | 01-03 | App is deployed and live on Netlify with a public URL | SATISFIED | Developer confirmed https://sultanesdelfubol.netlify.app is live; netlify.toml present |
| INF-02 | 01-02 | Unauthenticated users cannot access protected routes | SATISFIED | ProtectedRoute: Navigate to /login with state.from when !user |
| INF-03 | 01-01 | No cross-user data exposure (RLS on all tables) | SATISFIED | profiles migration: RLS enabled, all three policies use auth.uid() = id only |
| INF-05 | 01-03 | Supabase anti-pause ping Edge Function every 3 days | SATISFIED | ping/index.ts deployed with --no-verify-jwt; cron-job.org job confirmed by developer |
| INF-06 | 01-03 | Supabase daily backups enabled | PASSED (override) | Not available on free tier; accepted risk documented in 01-03-SUMMARY.md; override applied |

### Anti-Patterns Found

No blockers. No TBD/FIXME/XXX markers found in any phase-modified file. No stub returns found outside the intentional D-11 `if (user) return null` guard pattern (which is correct React behavior, not a stub). No hardcoded empty data flowing to render.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/pages/HomePage.tsx` | comment | `// Placeholder home page — replaced by /calendario in Phase 2` | Info | Intentional D-14 placeholder; profile data is live from store; not a functional stub |

### Human Verification Required

The following items require live browser testing against the production URL. All automated checks pass; these are behaviors requiring email delivery, live DB writes, and real auth state that cannot be asserted via grep.

#### 1. Live Registration Creates profiles Row

**Test:** Register at https://sultanesdelfubol.netlify.app/registro with a fresh username + email + password. Then open Supabase Dashboard -> Table Editor -> profiles.
**Expected:** A row exists with id matching the auth.users id, username as entered, tokens = 0, is_admin = false, is_blocked = false.
**Why human:** Cannot query the live Supabase DB programmatically from this context.

#### 2. Live Login Shows Real Username and Token Balance

**Test:** Log in on the live URL after registration. Observe the navbar.
**Expected:** Navbar shows the exact username registered and "Fichas: 0" in green.
**Why human:** Requires a live Supabase session and production auth flow.

#### 3. Duplicate Username Rejected on Live URL

**Test:** Attempt to register a second account with an already-used username on the live URL.
**Expected:** Error banner shows exactly: "Este nombre de usuario ya está en uso. Elige otro."
**Why human:** Requires the 23505 constraint to fire against the live DB.

#### 4. Password Reset Email Round-Trip

**Test:** On /restablecer-contrasena, enter a registered email and click "Enviar enlace". Check the email inbox, follow the reset link, set a new password, confirm login works.
**Expected:** Email arrives from Supabase, link leads back to /login, new password is accepted, navbar shows username.
**Why human:** Requires live email delivery and interactive browser session.

### Gaps Summary

No hard gaps blocking the phase goal. All code artifacts are substantive, wired, and data-flowing. The one structural deviation is INF-06 (Supabase backups) which is accepted per the free-tier constraint and override above.

The human_needed status reflects that four behaviors (live production registration, live login display, duplicate rejection on production, password-reset email delivery) were developer-confirmed on local dev but require explicit production confirmation to fully close AUTH-01, AUTH-02, AUTH-03, AUTH-04 in the requirements tracker.

---

_Verified: 2026-06-05_
_Verifier: Claude (gsd-verifier)_
