---
phase: 02-calendar-quinielas
reviewed: 2026-06-06T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - supabase/migrations/0002_matches_predictions.sql
  - supabase/seed/matches_wc2026.sql
  - src/types/index.ts
  - src/store/authStore.ts
  - src/components/TimezonePicker.tsx
  - src/components/MatchCard.tsx
  - src/components/PredictionModal.tsx
  - src/pages/CalendarPage.tsx
  - src/pages/LeaderboardPage.tsx
  - src/App.tsx
  - src/components/Navbar.tsx
  - src/pages/LoginPage.tsx
  - src/pages/RegistroPage.tsx
findings:
  critical: 4
  warning: 5
  info: 3
  total: 12
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The phase 02 implementation covers the match calendar, quinielas prediction flow, leaderboard, and auth pages. The SQL migration is structurally sound (RLS on all tables, SECURITY DEFINER for token mutations, correct constraint enforcement) and the React components follow consistent patterns. However, four blockers prevent correct behavior in production:

1. The `leaderboard_view` is a plain `SECURITY INVOKER` view against a table with a row-filtering RLS policy — every user will see only their own row, making the leaderboard permanently broken.
2. The `place_prediction` function has a TOCTOU race on the token check; under concurrent requests the DB constraint fires instead of the custom error, so users receive an unhelpful generic error.
3. The prediction modal accepts and silently truncates non-integer score inputs (e.g. "2.5" → 2), and does not show the chosen scores on the confirmation step.
4. An orphaned auth user is created when the profile INSERT fails during registration, with no cleanup path.

---

## Critical Issues

### CR-01: `leaderboard_view` always returns only the current user's own row

**File:** `supabase/migrations/0002_matches_predictions.sql:84-90`

**Issue:** `leaderboard_view` is a standard (SECURITY INVOKER) view that queries `public.profiles`. Postgres 15+ applies the underlying table's RLS policies to SECURITY INVOKER views. The `profiles_select_own` policy evaluates `auth.uid() = id`, so every authenticated user's query against the view is silently filtered to their single row. The leaderboard will never display other participants — the core social feature of the quinielas is broken.

**Fix:** Re-create the view with `SECURITY DEFINER` and owned by a role that has unrestricted SELECT on profiles, or grant the `authenticated` role a separate read-only policy on profiles for leaderboard columns only. The simplest correct approach in Supabase:

```sql
-- Drop and re-create as a security-definer view
-- owned by postgres (superuser) so RLS is bypassed
create or replace view public.leaderboard_view
  with (security_invoker = false)   -- explicit SECURITY DEFINER
as
  select id, username, tokens, leaderboard_points
  from public.profiles
  order by leaderboard_points desc, tokens desc;

-- Restrict to authenticated only (anon cannot see the leaderboard)
revoke all on public.leaderboard_view from public, anon;
grant select on public.leaderboard_view to authenticated;
```

Alternatively, add a second RLS policy on `profiles` that permits cross-user SELECT of only the safe leaderboard columns — but that requires Postgres column-level RLS which is not straightforward. The SECURITY DEFINER view is the standard Supabase pattern.

---

### CR-02: TOCTOU race in `place_prediction` lets concurrent calls bypass the token check, producing a constraint violation instead of the mapped error message

**File:** `supabase/migrations/0002_matches_predictions.sql:127-138`

**Issue:** The function reads `tokens` into `v_user_tokens`, checks `v_user_tokens < 20`, then later issues `UPDATE profiles SET tokens = tokens - 20`. There is no `FOR UPDATE` lock on the profiles row between the SELECT and the UPDATE. Two concurrent calls for the same user both pass the check when the user has exactly 20 tokens, then both fire the UPDATE. The second UPDATE drives tokens to -20, which violates the `tokens >= 0` CHECK constraint (PostgreSQL error code `23514`). The modal only maps `insufficient_tokens` (a custom exception) and `23505` (duplicate prediction) — error code `23514` falls through to the generic "No se pudo guardar tu predicción" message. The user is told something went wrong rather than "not enough tokens."

**Fix:** Lock the profile row during the check to serialize concurrent calls:

```sql
-- Replace the SELECT ... INTO v_user_tokens block with:
select tokens into v_user_tokens
from public.profiles
where id = v_user_id
for update;                -- acquires row lock until end of transaction
```

This ensures the second concurrent call blocks until the first commits, then re-reads the updated (now 0) token balance and raises `insufficient_tokens` as intended.

---

### CR-03: `PredictionModal` sends a silently truncated score when the user types a decimal, and the confirmation step does not display the chosen scores

**File:** `src/components/PredictionModal.tsx:53-79, 253, 263-291`

**Issue — data mismatch:** `parseInt(homeScore, 10)` silently truncates `"2.5"` to `2`. The HTML `<input type="number">` does not prevent decimal input on all browsers/keyboards. The user sees "2.5" in the input field, advances to the confirm step, clicks Confirm, but the RPC receives `2`. The prediction badge and the DB record will show `2`, not `2.5` — a silent discrepancy the user cannot detect.

**Issue — missing score on confirm step:** The confirmation step (lines 263–291) only asks "¿Estás seguro?" with no display of the entered scores. The user cannot verify what they are confirming before the irreversible deduction.

**Fix for truncation:** Validate that both inputs are non-negative integers before allowing the step transition:

```typescript
// In the "Confirmar predicción" onClick handler (line 254):
onClick={() => {
  const h = parseInt(homeScore, 10);
  const a = parseInt(awayScore, 10);
  if (
    isNaN(h) || isNaN(a) ||
    h < 0 || a < 0 ||
    String(h) !== homeScore.trim() || String(a) !== awayScore.trim()
  ) {
    setError('Ingresa números enteros válidos (0 o más).');
    return;
  }
  setStep('confirm');
}}
```

**Fix for missing scores on confirm step:** Show the chosen scores in the confirm step:

```tsx
<p className="text-base text-slate-100 mb-2">
  {match.home_team} <strong>{homeScore}</strong> – <strong>{awayScore}</strong> {match.away_team}
</p>
<p className="text-sm text-slate-400 mb-4">
  ¿Estás seguro? Esta predicción no se puede cambiar. Se descontarán 20 fichas.
</p>
```

---

### CR-04: Orphaned auth user on profile INSERT failure in `RegistroPage`

**File:** `src/pages/RegistroPage.tsx:88-112`

**Issue:** If `supabase.from('profiles').insert(...)` fails (network error, DB constraint, etc.), the `auth.users` row already exists. The user now has an auth account but no profile row. On their next login attempt, `App.tsx` will call `setProfile(data)` with `data = null` (because `.single()` returns null for a missing row). The `ProtectedRoute` passes them through (it only checks `user`, not `profile`), Navbar shows `undefined` for username, and `place_prediction` will fail because no `profiles` row exists for their `auth.uid()`. There is no recovery path — the user cannot re-register with the same email (Supabase Auth rejects it) and cannot create their own profile from the frontend (the INSERT policy allows it but they are already past the registration flow).

**Fix:** Delete the auth user when the profile INSERT fails. The anon key cannot call `supabase.auth.admin.deleteUser()`, so the best available mitigation is to use a Supabase Edge Function for atomic sign-up, or at minimum redirect back to the registration form with a specific error and document a manual admin cleanup step. Short-term workaround:

```typescript
if (profileError) {
  // Attempt sign-out so the orphaned auth session is cleared.
  // The auth user still exists but at least the next /registro attempt
  // will fail gracefully at the auth.signUp step rather than silently.
  await supabase.auth.signOut();

  if (profileError.code === '23505') {
    setError('Este nombre de usuario ya está en uso. Elige otro.');
  } else {
    setError('Algo salió mal al crear tu perfil. Intenta de nuevo.');
  }
  setLoading(false);
  return;
}
```

The proper fix is an atomic Edge Function that wraps auth user creation and profile insertion in a single server-side transaction.

---

## Warnings

### WR-01: Prediction errors from the `predictions` fetch are silently swallowed in `CalendarPage`

**File:** `src/pages/CalendarPage.tsx:57-65`

**Issue:** The `Promise.all` destructures the predictions result as `{ data: predData }` with no error binding. If the predictions fetch fails (network issue, RLS denial), `predData` is `null`, `setPredictions([])` is called, and the calendar renders with no prediction badges. No error is surfaced to the user. Worse, if the user then submits a prediction for a match they already predicted (the badge was missing), the UI will add a second local prediction optimistically but the RPC will return error code `23505` ("ya tienes una predicción").

**Fix:**

```typescript
const [
  { data: matchData, error: matchError },
  { data: predData, error: predError },
] = await Promise.all([
  supabase.from('matches').select('*').order('match_datetime'),
  supabase.from('predictions').select('*'),
]);
if (matchError) {
  setError('No se pudieron cargar los partidos. Recarga la página.');
} else {
  setMatches(matchData ?? []);
  if (predError) {
    // Non-fatal: show matches but warn user predictions could not be loaded.
    console.warn('predictions fetch failed:', predError.message);
  }
  setPredictions(predData ?? []);
}
```

---

### WR-02: `is_blocked` is stored in the profile but never enforced on the frontend

**File:** `src/components/ProtectedRoute.tsx:9-15`, `src/App.tsx:26-31`

**Issue:** `profile.is_blocked` exists in the DB schema and is populated in `authStore`, but `ProtectedRoute` only checks `user !== null`. A blocked user can log in, view the calendar, and call `place_prediction`. The backend SQL function does not check `is_blocked` either, so a blocked user can still wager tokens and submit predictions.

**Fix:** Enforce the block in `ProtectedRoute` and in `place_prediction`:

```typescript
// ProtectedRoute.tsx
if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
if (profile?.is_blocked) return <Navigate to="/login" state={{ blocked: true }} replace />;
```

```sql
-- In place_prediction, after the token check:
if (select is_blocked from public.profiles where id = v_user_id) then
  raise exception 'user_blocked';
end if;
```

---

### WR-03: `updateTokens` in `authStore` accepts negative deltas that can drive the displayed balance below zero

**File:** `src/store/authStore.ts:27-31`

**Issue:** `updateTokens(delta)` applies `tokens + delta` with no lower bound. If called with `delta = -20` when `profile.tokens` is `0` in the local store (possible if the store is stale after a page reload), the displayed balance shows a negative number until the next auth refresh. The DB enforces `tokens >= 0` so the actual value is never negative, but the Navbar shows a negative count until the next page load.

**Fix:**

```typescript
updateTokens: (delta) => set((state) => ({
  profile: state.profile
    ? { ...state.profile, tokens: Math.max(0, state.profile.tokens + delta) }
    : null,
})),
```

---

### WR-04: `App.tsx` non-null asserts `session.user.email` without checking for undefined

**File:** `src/App.tsx:22`

**Issue:** `session.user.email!` uses a TypeScript non-null assertion. Supabase Auth supports passwordless / magic-link flows and OAuth providers where email can be `undefined`. While the current login flow always uses email+password so this is unlikely to trigger now, adding new auth methods later (OAuth, magic link) would cause a runtime crash in `onAuthStateChange` and leave the app in a broken loading state.

**Fix:**

```typescript
setUser({ id: session.user.id, email: session.user.email ?? '' });
```

Or update `AuthUser.email` to `string | undefined` and handle the undefined case downstream.

---

### WR-05: `Navbar` logout button is missing `type="button"` and could trigger form submission if ever nested in a form

**File:** `src/components/Navbar.tsx:44-49`

**Issue:** The `<button onClick={signOut}>` has no explicit `type` attribute. Buttons default to `type="submit"` inside `<form>` elements. While the Navbar is currently not inside a form, this is a latent correctness issue — if a page ever wraps content including the Navbar in a form (unlikely but possible in layout changes), the signOut button would submit the form.

**Fix:**

```tsx
<button
  type="button"
  onClick={signOut}
  ...
>
```

---

## Info

### IN-01: `v_actual_away_sign` and `v_pred_away_sign` declared but never used in `calculate_prediction_points`

**File:** `supabase/migrations/0002_matches_predictions.sql:185,187`

**Issue:** Two `integer` variables are declared in the `DECLARE` block but never assigned or referenced. The outcome detection logic correctly uses only `v_actual_home_sign` and `v_pred_home_sign` (the sign of `home - away` is sufficient to determine win/draw/loss). The unused declarations are dead code left over from an early draft.

**Fix:** Remove the two unused variable declarations:

```sql
-- Remove these two lines from the DECLARE block:
-- v_actual_away_sign integer;
-- v_pred_away_sign   integer;
```

---

### IN-02: `local-${Date.now()}` fake prediction ID could collide and bypasses the `Prediction` type contract

**File:** `src/pages/CalendarPage.tsx:96`

**Issue:** After a successful prediction, a synthetic `Prediction` object is injected into local state with `id: \`local-${Date.now()}\`` and `user_id: ''`. The `Prediction` type declares `user_id: string` (non-empty UUID). If the user opens the same match card again before a page refresh, `getPredictionForMatch` returns this synthetic prediction and passes it as `existingPrediction` to `PredictionModal`. The read-only view renders correctly since `match_id` matches, but the `user_id: ''` string could cause confusion if that object is ever passed to anything that uses `user_id`.

**Fix:** On prediction success, re-fetch the predictions from Supabase to get the real row with a proper UUID, or populate `user_id` from `useAuthStore.getState().user?.id ?? ''`.

---

### IN-03: `Por grupo` view has no empty state when a group has no matches loaded yet

**File:** `src/pages/CalendarPage.tsx:258-269`

**Issue:** In the `view === 'grupo'` branch, if `matches` is empty (still loading or error), the `.filter(...).map(...)` chain renders nothing with no feedback. The loading spinner is hidden by the `{!loading && !error && (...)}` wrapper, so if the component is in the rare state of `loading=false, error='', matches=[]`, the group tab area is blank. This is a minor UX gap.

**Fix:** Add a fallback inside the grupo view:

```tsx
{matches.filter((m) => m.group_name === activeGroup).length === 0 ? (
  <p className="text-sm text-slate-400 py-8 text-center">Sin partidos para este grupo.</p>
) : (
  matches
    .filter((m) => m.group_name === activeGroup)
    .map((m) => <MatchCard ... />)
)}
```

---

_Reviewed: 2026-06-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
