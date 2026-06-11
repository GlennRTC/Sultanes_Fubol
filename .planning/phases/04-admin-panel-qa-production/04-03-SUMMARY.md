---
phase: 04-admin-panel-qa-production
plan: 03
subsystem: admin-ui
tags: [admin, routing, edge-function, security]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [admin-route-guard, admin-users-page, admin-matches-page, edge-fn-password-reset]
  affects: [src/App.tsx, src/components/Navbar.tsx]
tech_stack:
  added: []
  patterns: [AdminRoute guard parallel to ProtectedRoute, SECURITY DEFINER RPC calls with Spanish error mapping, Deno.serve Edge Function with anonClient + adminClient separation]
key_files:
  created:
    - src/components/AdminRoute.tsx
    - src/pages/AdminUsersPage.tsx
    - src/pages/AdminMatchesPage.tsx
    - src/pages/AdminPoolsPage.tsx
    - src/pages/AdminReportsPage.tsx
    - supabase/functions/admin-reset-password/index.ts
  modified:
    - src/App.tsx
    - src/components/Navbar.tsx
decisions:
  - AdminRoute placed inside the outer ProtectedRoute layout block so unauthenticated users are already caught before reaching the admin guard
  - Admin link in Navbar uses profile?.is_admin conditional — same pattern available because useAuthStore already exposes profile
  - AdminPoolsPage and AdminReportsPage created as stubs now so App.tsx wiring is complete before Plan 04-04
  - Edge Function uses anonClient for JWT validation and is_admin check, then separate adminClient with SUPABASE_SERVICE_ROLE_KEY for auth.admin calls — service role key never returned to browser
metrics:
  duration: "9 minutes"
  completed: 2026-06-11
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 4 Plan 3: Admin Routing, Users Page, Matches Page, and Password Reset Edge Function Summary

Admin routing layer, AdminUsersPage with block/grant/reset, AdminMatchesPage with score entry, and admin-reset-password Edge Function using service-role generateLink — all wired and TypeScript-clean.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AdminRoute + App.tsx routing + Navbar admin link | e1c4207 | AdminRoute.tsx, App.tsx, Navbar.tsx, AdminPoolsPage.tsx (stub), AdminReportsPage.tsx (stub) |
| 2 | AdminUsersPage + AdminMatchesPage + Edge Function | b709198 | AdminUsersPage.tsx, AdminMatchesPage.tsx, supabase/functions/admin-reset-password/index.ts |

## What Was Built

### AdminRoute.tsx
Guard component following ProtectedRoute structural pattern. Checks `profile?.is_admin` — redirects non-admins to `/calendario`. Unauthenticated users are already redirected to `/login` by the outer ProtectedRoute before reaching AdminRoute.

### App.tsx Changes
- Added imports for AdminRoute and all four admin pages
- Added `<Route element={<AdminRoute />}>` wrapping four sub-routes inside the existing layout block: `/admin/usuarios`, `/admin/partidos`, `/admin/apuestas`, `/admin/reportes`

### Navbar.tsx Changes
- Desktop nav: conditional `{profile?.is_admin && <NavLink to="/admin/usuarios">Admin</NavLink>}` after Tabla link
- Mobile dropdown: same conditional after Tabla link, with `onClick={() => setMenuOpen(false)}`

### AdminUsersPage.tsx
- Fetches all profiles ordered by username from `profiles` table (admin SELECT policy from Plan 04-02 enables this)
- Search filter by username (client-side)
- Block/unblock button: calls `admin_block_user` RPC, optimistic local state update, Spanish error messages
- Password reset button: calls `supabase.functions.invoke('admin-reset-password')`, shows Loader2 spinner during loading
- Token grant/remove form: select user, enter amount (negative to remove), optional note; calls `admin_grant_tokens` RPC, refreshes user list on success
- All errors mapped to Spanish: `not_admin`, `user_not_found`, `amount_cannot_be_zero`, `insufficient_tokens`

### AdminMatchesPage.tsx
- Fetches `status IN ('scheduled', 'live')` matches ordered by `match_datetime`
- Per-match score inputs (home/away) with per-match submit button
- `admin_set_match_result` RPC called on submit; match removed from list on success (it becomes `finished` after the function runs `calculate_prediction_points`)
- Timezone display via `formatInTimeZone` using `localStorage.getItem('fubol_timezone')` fallback to browser locale
- Spanish error mapping: `not_admin`, `match_not_found`, `invalid_score`

### supabase/functions/admin-reset-password/index.ts
- `Deno.serve` pattern (same as existing `ping` function)
- Step 1: Validates Authorization header → `anonClient.auth.getUser()` to verify JWT
- Step 2: `anonClient.from('profiles').select('is_admin')` to confirm caller is admin
- Step 3: Parses `userId` from request body
- Step 4: `adminClient` (SUPABASE_SERVICE_ROLE_KEY) → `auth.admin.getUserById(userId)` to get email
- Step 5: `adminClient.auth.admin.generateLink({ type: 'recovery', email })` — sends reset email
- Step 6: Inserts `password_reset_sent` to `admin_logs` via service role client
- Returns `{ ok: true }` — no link/email data exposed to caller
- DEPLOY NOTE comment at top; does NOT use `--no-verify-jwt`

## Verification Results

| Check | Result | Expected |
|-------|--------|----------|
| `grep -c "AdminRoute" src/App.tsx` | 2 | >=2 |
| `grep -c "admin/usuarios" src/App.tsx` | 1 | 1 |
| `grep -c "is_admin" src/components/Navbar.tsx` | 2 | >=2 |
| `grep -c "admin_block_user" AdminUsersPage.tsx` | 1 | >=1 |
| `grep -c "admin-reset-password" AdminUsersPage.tsx` | 1 | >=1 |
| `grep -c "admin_set_match_result" AdminMatchesPage.tsx` | 1 | >=1 |
| `grep -c "generateLink" admin-reset-password/index.ts` | 1 | >=1 |
| `grep -c "SERVICE_ROLE_KEY" admin-reset-password/index.ts` | 1 | >=1 |
| `npx tsc --noEmit` | PASS | no errors |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- `npm install` was required before running `tsc --noEmit` since `node_modules/` was absent from the working environment. This is environment setup, not a code deviation.
- `npx tsc` attempted first but downloaded a stale `tsc@2.0.4` package (not TypeScript). Used `node_modules/.bin/tsc` directly after `npm install` completed.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `export function AdminPoolsPage() { return null; }` | src/pages/AdminPoolsPage.tsx | Placeholder for Plan 04-04; App.tsx routes wired now to avoid App.tsx changes in future plans |
| `export function AdminReportsPage() { return null; }` | src/pages/AdminReportsPage.tsx | Placeholder for Plan 04-04; same reason |

These stubs intentionally return null and do not prevent the plan's goals (admin routing layer, user management, match results) from being achieved. Plan 04-04 will replace them with full implementations.

## Threat Flags

No new threat surface introduced beyond what was planned. The Edge Function's security model was implemented exactly as specified in THREAT_MODEL:
- T-04-12: AdminRoute redirects non-admins + SQL functions enforce server-side
- T-04-13: Service role key stays in `Deno.env` only; never in response body
- T-04-14: JWT validated via `anonClient.auth.getUser()` before any admin action
- T-04-17: `password_reset_sent` logged to `admin_logs` via service role client

## Self-Check: PASSED

- [x] `src/components/AdminRoute.tsx` — exists
- [x] `src/pages/AdminUsersPage.tsx` — exists
- [x] `src/pages/AdminMatchesPage.tsx` — exists
- [x] `src/pages/AdminPoolsPage.tsx` — exists (stub)
- [x] `src/pages/AdminReportsPage.tsx` — exists (stub)
- [x] `supabase/functions/admin-reset-password/index.ts` — exists
- [x] Commit e1c4207 — Task 1 (AdminRoute + routing + Navbar)
- [x] Commit b709198 — Task 2 (AdminUsersPage + AdminMatchesPage + Edge Function)
- [x] TypeScript compiles clean (`npx tsc --noEmit` — no output = success)
