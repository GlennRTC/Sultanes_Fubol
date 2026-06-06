---
phase: 02-calendar-quinielas
fixed_at: 2026-06-06T00:00:00Z
review_path: .planning/phases/02-calendar-quinielas/02-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-06-06T00:00:00Z
**Source review:** .planning/phases/02-calendar-quinielas/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-01: leaderboard_view always returns only the current user's own row

**Files modified:** `supabase/migrations/0003_phase02_fixes.sql`
**Commit:** df3599d
**Applied fix:** Created new migration 0003_phase02_fixes.sql that recreates leaderboard_view with `security_invoker = false` so the profiles_select_own RLS policy is bypassed and all users are visible in the leaderboard.

### CR-02: TOCTOU race in place_prediction lets concurrent calls bypass the token check

**Files modified:** `supabase/migrations/0003_phase02_fixes.sql`
**Commit:** df3599d
**Applied fix:** Recreated place_prediction in the same new migration with `FOR UPDATE` on the profile row SELECT, serializing concurrent calls so both cannot pass the token check simultaneously.

### CR-03: PredictionModal sends silently truncated score and confirm step has no score display

**Files modified:** `src/components/PredictionModal.tsx`
**Commit:** c1f8ba8
**Applied fix:** Added integer validation in the "Confirmar predicción" onClick — rejects decimals and non-integers with a Spanish error message. Added score display (`home <strong>N</strong> – <strong>M</strong> away`) above the warning text in the confirm step.

### CR-04: Orphaned auth user on profile INSERT failure in RegistroPage

**Files modified:** `src/pages/RegistroPage.tsx`
**Commit:** 2dc86a7
**Applied fix:** Added `await supabase.auth.signOut()` before setting the error in the profileError branch, clearing the orphaned auth session so the user is not stuck logged in with no profile row.

### WR-01: Prediction errors from the predictions fetch are silently swallowed in CalendarPage

**Files modified:** `src/pages/CalendarPage.tsx`
**Commit:** f5ac956
**Applied fix:** Destructured `predError` from the Promise.all result; added `console.warn` when it fails (non-fatal — matches still render). Added early `return` after `setLoading(false)` in the matchError branch for cleaner flow.

### WR-02: is_blocked not enforced in ProtectedRoute

**Files modified:** `src/components/ProtectedRoute.tsx`
**Commit:** 263ed39
**Applied fix:** Added `profile` to the useAuthStore destructure and added `if (profile?.is_blocked) return <Navigate to="/login" replace />;` after the `!user` check.

### WR-03: updateTokens can drive the displayed balance below zero

**Files modified:** `src/store/authStore.ts`
**Commit:** 84cc084
**Applied fix:** Wrapped the token sum with `Math.max(0, state.profile.tokens + delta)` so the displayed balance never goes below zero when the store is stale.

### WR-04: App.tsx non-null asserts session.user.email without checking for undefined

**Files modified:** `src/App.tsx`
**Commit:** f34ded2
**Applied fix:** Changed `session.user.email!` to `session.user.email ?? ''` to avoid a runtime crash for OAuth/magic-link auth flows where email may be undefined.

### WR-05: Navbar logout button missing type="button"

**Files modified:** `src/components/Navbar.tsx`
**Commit:** fd2b206
**Applied fix:** Added `type="button"` to the Cerrar sesión button to prevent accidental form submission if the Navbar is ever nested in a form.

---

_Fixed: 2026-06-06T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
