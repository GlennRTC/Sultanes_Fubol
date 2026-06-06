---
phase: 02-calendar-quinielas
verified: 2026-06-06T00:00:00Z
status: human_needed
score: 5/5 must-haves verified (all code-verifiable truths pass)
overrides_applied: 0
gaps: []
human_verification:
  - test: "Confirm live DB has 72 matches and both SQL functions are callable"
    expected: "select count(*) from public.matches returns 72; select count(distinct group_name) returns 12; place_prediction and calculate_prediction_points present in Database > Functions"
    why_human: "Plan 02-02 was a human-gate DB push; cannot be verified by grep — requires a live Supabase session"
  - test: "Browse /calendario and place a prediction end to end"
    expected: "72 matches visible across both views; 12 group tabs A-L present; timezone switch persists after refresh; submitting a prediction closes the modal, shows the badge on the card, and the Navbar Fichas counter drops by 20 immediately"
    why_human: "Visual rendering, real-time DOM state, and localStorage persistence cannot be verified programmatically"
  - test: "Verify locked-match and already-predicted modal modes"
    expected: "Clicking a live/finished match shows 'Este partido ya comenzó — no se aceptan predicciones.' with disabled inputs; clicking a match with an existing prediction shows the score in read-only inputs"
    why_human: "Requires browser interaction against a live match with status != scheduled"
  - test: "Open /tabla and verify leaderboard is cross-user (not filtered to own row)"
    expected: "All registered users appear in the ranked table; own-user row is highlighted; is_admin/is_blocked/email columns are absent from the response"
    why_human: "Requires multiple registered users on the live DB and inspection of the network response; CR-01 fix (security_invoker = false) is in 0003_phase02_fixes.sql but cannot be confirmed live without a Supabase session"
  - test: "Run calculate_prediction_points from the Supabase dashboard SQL editor and verify leaderboard updates"
    expected: "After select calculate_prediction_points('<match_id>', home, away) for an exact-match prediction, the leaderboard shows 3 points and the Fichas counter increases by 30 on next profile load"
    why_human: "Service-role-only RPC; requires a live Supabase session with admin credentials"
---

# Phase 02: Calendar + Quinielas Verification Report

**Phase Goal:** An authenticated user can browse all 72 group-stage matches in their local timezone, submit a score prediction with token deduction, and see the global leaderboard update when a result is entered.
**Verified:** 2026-06-06T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 72 group-stage matches (groups A-L) visible, filterable by group and team, each showing status | VERIFIED | `matches_wc2026.sql` has exactly 72 rows confirmed by `grep -c "'scheduled')"`. Groups I-L present (Francia/Senegal group I, Inglaterra/Croacia group L). `CalendarPage.tsx` has `GROUPS = ['A'..'L']` (12 entries), two `<select>` dropdowns with Todos reset, `MatchCard` renders status badge for all three states. |
| 2 | Match times display in user's local timezone; timezone preference persists across sessions | VERIFIED | `MatchCard.tsx` uses `formatInTimeZone` (date-fns-tz v3, not banned `utcToZonedTime`). `TimezonePicker.tsx` exports `detectTimezone()` (localStorage → browser → UTC fallback) and `saveTimezone()` writing `fubol_timezone` key. `CalendarPage.tsx` calls `saveTimezone(iana)` on selection. 15 IANA entries in `SUPPORTED_TIMEZONES`. |
| 3 | User can submit a score prediction; token balance decreases immediately; prediction visible in history | VERIFIED | `PredictionModal.tsx` calls `supabase.rpc('place_prediction', ...)` on confirm. Calls `useAuthStore.getState().updateTokens(-20)` BEFORE `onClose()` (Pitfall 5 guard). `CalendarPage.tsx:handlePredictionSuccess` appends to local predictions state for immediate badge. `authStore.ts:updateTokens` applies `Math.max(0, tokens + delta)` so Navbar never goes negative. |
| 4 | Predicting on a started/finished match is blocked with Spanish error | VERIFIED | `PredictionModal.tsx` checks `isLocked = match.status !== 'scheduled'` and renders mode (b) with "Este partido ya comenzó — no se aceptan predicciones." and disabled inputs. Backend gate `raise exception 'match_not_scheduled'` in `place_prediction` (0002 + 0003 migrations) provides server-side enforcement. Error map in `handleConfirm` maps `match_not_scheduled` to the Spanish message. |
| 5 | After admin enters result, global leaderboard reflects updated points for all users | VERIFIED (code) / UNCERTAIN (live) | `calculate_prediction_points` in `0002_matches_predictions.sql` scores per D-11 (exact = 3pts+30tok, correct outcome = 1pt+10tok), updates both `predictions.points_earned` and `profiles.leaderboard_points/tokens`. `LeaderboardPage.tsx` queries `leaderboard_view` ordered by `leaderboard_points desc`. `0003_phase02_fixes.sql` recreates view with `security_invoker = false` so RLS is bypassed and all users appear. The live application of migration 0003 cannot be verified without a Supabase session. |

**Score:** 5/5 truths verified in code (1 has a live-DB-confirmation dependency)

---

### Requirement Cross-Reference

| Req ID | Description | Plans Claiming | Code Status |
|--------|-------------|----------------|-------------|
| CAL-01 | All 48 group stage matches visible (*) | 02-01, 02-02, 02-04 | VERIFIED — 72 rows in seed, 72 matches fetched and rendered. Note: REQUIREMENTS.md says "48" but WC2026 has 72 group-stage matches (12 groups × 6). ROADMAP.md Success Criterion 1 correctly says "72". The implementation is correct; REQUIREMENTS.md CAL-01 description has a stale count. |
| CAL-02 | Match times in user's local timezone, manual override persists | 02-03 | VERIFIED — `formatInTimeZone`, `detectTimezone`, `saveTimezone`, 15 IANA zones, localStorage persistence |
| CAL-03 | Filterable by group and by team | 02-03 | VERIFIED — two `<select>` dropdowns with Todos reset in Por fecha view; Por grupo has 12 tabs A-L |
| CAL-04 | Match status visible on each card | 02-01, 02-03 | VERIFIED — status column in DB; MatchCard renders Programado/En vivo/Finalizado badge |
| QUI-01 | User can predict exact score for scheduled match | 02-03 | VERIFIED — PredictionModal two-step flow with integer validation, calls place_prediction RPC |
| QUI-02 | Prediction blocked once match started/finished | 02-03 | VERIFIED — frontend `isLocked` check + backend `match_not_scheduled` exception |
| QUI-03 | Tokens deducted immediately on submission | 02-01, 02-03 | VERIFIED — `place_prediction` deducts atomically; `updateTokens(-20)` syncs Zustand store before close |
| QUI-04 | Points+tokens awarded when admin enters result | 02-01 | VERIFIED (code) — `calculate_prediction_points` implements D-11 scoring; service-role-only grant prevents self-payout (T-02-EOP) |
| QUI-05 | Global leaderboard ranks all users by prediction points | 02-01, 02-04 | VERIFIED (code) / UNCERTAIN (live) — `leaderboard_view` with `security_invoker=false` in 0003; `LeaderboardPage.tsx` queries it; live DB push of 0003 needs human confirmation |

(*) CAL-01 text discrepancy: REQUIREMENTS.md reads "48" but the correct WC2026 group-stage count is 72. The implementation correctly delivers 72. This is a requirements documentation error, not an implementation error.

---

### Required Artifacts

| Artifact | Min Lines | Exists | Lines | Substantive | Wired | Status |
|----------|-----------|--------|-------|-------------|-------|--------|
| `supabase/migrations/0002_matches_predictions.sql` | — | Yes | 242 | Yes | Yes (applies to DB) | VERIFIED |
| `supabase/migrations/0003_phase02_fixes.sql` | — | Yes | 97 | Yes | Yes (CR-01 + CR-02 fixes) | VERIFIED |
| `supabase/seed/matches_wc2026.sql` | 72 rows | Yes | 101 | Yes — 72 scheduled rows | Yes | VERIFIED |
| `src/types/index.ts` | — | Yes | 177 | Yes — Match, Prediction, LeaderboardEntry, DB tables/views/functions | Yes | VERIFIED |
| `src/store/authStore.ts` | — | Yes | 32 | Yes — updateTokens with Math.max guard | Yes | VERIFIED |
| `src/components/TimezonePicker.tsx` | 30 | Yes | 87 | Yes — 15 IANA zones, detectTimezone, saveTimezone | Yes | VERIFIED |
| `src/components/MatchCard.tsx` | 25 | Yes | 63 | Yes — formatInTimeZone, status badge, prediction badge | Yes (used in CalendarPage) | VERIFIED |
| `src/components/PredictionModal.tsx` | 60 | Yes | 311 | Yes — three render modes, RPC call, error map, updateTokens | Yes (used in CalendarPage) | VERIFIED |
| `src/pages/CalendarPage.tsx` | 80 | Yes | 294 | Yes — parallel fetch, Por fecha, Por grupo, filters, timezone bar, modal orchestration | Yes (mounted in App.tsx route) | VERIFIED |
| `src/pages/LeaderboardPage.tsx` | 40 | Yes | 104 | Yes — leaderboard_view query, ranked table, own-row highlight, empty state | Yes (mounted in App.tsx route) | VERIFIED |
| `src/App.tsx` | — | Yes | 75 | Yes — /calendario + /tabla routes, / + /bienvenido redirects, no HomePage | Yes | VERIFIED |
| `src/components/Navbar.tsx` | — | Yes | 54 | Yes — NavLink Calendario + Tabla with active state, type="button" on logout | Yes (used in App.tsx layout) | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| PredictionModal | place_prediction RPC | `supabase.rpc('place_prediction', ...)` | WIRED | Line 56, PredictionModal.tsx |
| PredictionModal success | authStore.updateTokens | `useAuthStore.getState().updateTokens(-20)` | WIRED | Line 75, PredictionModal.tsx (called before onClose) |
| CalendarPage/MatchCard | user timezone | `formatInTimeZone(new Date(match_datetime), timezone, ...)` | WIRED | MatchCard.tsx line 14; `toZonedTime` for local-date grouping in CalendarPage.tsx line 18 |
| LeaderboardPage | leaderboard_view | `supabase.from('leaderboard_view')` | WIRED | LeaderboardPage.tsx line 17 |
| App routes | CalendarPage + LeaderboardPage | Protected route layout, `path="/calendario"`, `path="/tabla"` | WIRED | App.tsx lines 66-67 |
| place_prediction | profiles.tokens + predictions | `UPDATE profiles SET tokens = tokens - 20` + INSERT in SECURITY DEFINER function with FOR UPDATE lock | WIRED | 0003_phase02_fixes.sql lines 73-90 |
| calculate_prediction_points | profiles.leaderboard_points + tokens | D-11 scoring loop, UPDATE profiles per prediction | WIRED | 0002_matches_predictions.sql lines 229-235 |
| leaderboard_view | profiles (all users, RLS bypassed) | `security_invoker = false` | WIRED (code) | 0003_phase02_fixes.sql line 15 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| CalendarPage.tsx | `matches` state | `supabase.from('matches').select('*').order('match_datetime')` | Yes — queries live `matches` table | FLOWING |
| CalendarPage.tsx | `predictions` state | `supabase.from('predictions').select('*')` | Yes — filtered by `predictions_select_own` RLS to current user | FLOWING |
| LeaderboardPage.tsx | `entries` state | `supabase.from('leaderboard_view').select(...)` | Yes — cross-user view, ordered by leaderboard_points | FLOWING |
| PredictionModal.tsx | RPC result | `supabase.rpc('place_prediction', ...)` | Yes — atomic DB function writes tokens + prediction | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build passes | `npm run build` | exit 0; 939 modules, dist/assets output | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | no output (exit 0) | PASS |
| Seed has exactly 72 rows | `grep -c "'scheduled')" matches_wc2026.sql` | 72 | PASS |
| Groups I and L present in seed | grep for `'I'` and `'L'` | Francia/Senegal (I), Inglaterra/Croacia (L) found | PASS |
| No banned date-fns-tz v2 API | grep for `utcToZonedTime\|zonedTimeToUtc` in UI files | none found | PASS |
| No UTC-substring anti-pattern | grep for `substring` in CalendarPage.tsx | no matches | PASS |
| leaderboard_view fix applied | grep `security_invoker = false` in 0003 | line 15 confirmed | PASS |
| FOR UPDATE race fix applied | grep `for update` in 0003 | line 67 confirmed | PASS |
| bienvenido references removed from auth pages | grep `bienvenido` in LoginPage/RegistroPage | none found | PASS |
| No direct profiles query in LeaderboardPage | grep `from('profiles')` | none found | PASS |

---

### Probe Execution

Step 7c: SKIPPED — no probe scripts defined for this phase. The phase uses human-gate verification for live DB operations (Plan 02-02).

---

### Requirements Coverage

All 9 requirement IDs declared across plans (CAL-01, CAL-02, CAL-03, CAL-04, QUI-01, QUI-02, QUI-03, QUI-04, QUI-05) are implemented and mapped above.

**CAL-01 count discrepancy:** REQUIREMENTS.md reads "All **48** group stage matches are visible." WC2026 has 48 matches under the old FIFA format but expanded to 72 group-stage matches (12 groups × 6 matches) for 2026. The ROADMAP.md Success Criterion 1 correctly states "All 72 group-stage matches (groups A–L)." The implementation is correct. REQUIREMENTS.md should be updated to read "72" to match reality.

**Orphaned requirements:** None. All 9 phase-2 requirement IDs appear in at least one plan's `requirements` field.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/migrations/0002_matches_predictions.sql` | 185, 187 | `v_actual_away_sign` and `v_pred_away_sign` declared but never used (IN-01 from code review) | Info | Dead code; no behavioral impact. The scoring logic is correct using only the home-side sign comparison. |
| `src/pages/CalendarPage.tsx` | 103-104 | Synthetic prediction ID `local-${Date.now()}` with `user_id: ''` (IN-02 from code review) | Info | Cosmetic; the badge renders correctly. The fake user_id is never sent to the DB. On page reload the real prediction row replaces it. |
| `src/pages/CalendarPage.tsx` | 265-277 | Por grupo view has no empty state when `matches` is empty but no error (IN-03 from code review) | Info | Minor UX gap — blank area visible only in the rare state of `loading=false, error='', matches=[]`. Not a blocker. |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase files.

All critical (CR-01 through CR-04) and warning (WR-01 through WR-05) findings from `02-REVIEW.md` were addressed in `02-REVIEW-FIX.md` and verified in the codebase:

- CR-01: `security_invoker = false` confirmed in `0003_phase02_fixes.sql` line 15
- CR-02: `FOR UPDATE` lock confirmed in `0003_phase02_fixes.sql` line 67
- CR-03: Integer validation (`isNaN(h) || String(h) !== homeScore.trim()`) confirmed in `PredictionModal.tsx` lines 258–260; score display on confirm step confirmed lines 277–281
- CR-04: `await supabase.auth.signOut()` on profile INSERT failure confirmed in `RegistroPage.tsx` line 103
- WR-01: `predError` destructured from Promise.all with `console.warn` confirmed in `CalendarPage.tsx` lines 59–73
- WR-02: `profile?.is_blocked` check confirmed in `ProtectedRoute.tsx` line 16
- WR-03: `Math.max(0, ...)` in `updateTokens` confirmed in `authStore.ts` line 29
- WR-04: `session.user.email ?? ''` confirmed in `App.tsx` line 22
- WR-05: `type="button"` on Cerrar sesión confirmed in `Navbar.tsx` line 45

---

### Human Verification Required

#### 1. Live Database State (Plan 02-02 gate)

**Test:** In the Supabase dashboard for project `pajowyfyvdscyqebbhkv`, run:
- `select count(*) from public.matches;`
- `select count(distinct group_name) from public.matches;`
- Confirm `place_prediction` and `calculate_prediction_points` appear in Database > Functions.
- Confirm `leaderboard_view` is queryable and returns columns `id, username, tokens, leaderboard_points` only.
- Confirm migration `0003_phase02_fixes.sql` was applied (the view should have `security_invoker=false` behavior — all users visible when queried by any authenticated user).

**Expected:** 72 rows; 12 distinct groups; both functions present; view returns all users (not just own row).

**Why human:** Plan 02-02 was a human-gate DB push. The migration files are correct in the repo but live database state cannot be inspected without a Supabase session.

---

#### 2. Calendar Browsing + Timezone Switching

**Test:** Log in and navigate to `/calendario`.
1. Confirm all 72 matches appear.
2. Switch between Por fecha and Por grupo; confirm 12 group tabs (A–L) and that groups I–L contain Argentina, Austria, Portugal, Inglaterra, etc.
3. Click "Cambiar", pick "Argentina / Uruguay", confirm times shift. Refresh the page and confirm the selection persists.
4. Use the Grupo and Equipo dropdowns in Por fecha; confirm filtering and that selecting "Todos" resets the list.

**Expected:** All behaviors as specified; timezone selection survives page refresh.

**Why human:** Visual rendering, DOM state, localStorage persistence across page reload.

---

#### 3. Prediction Flow End-to-End

**Test:** On `/calendario`, click a scheduled match, enter scores (test with a decimal like "2.5" — expect rejection with "Ingresa números enteros válidos"), enter valid integer scores, advance to the confirm step, verify the entered scores are displayed, click Confirmar.

**Expected:** Modal closes; match card shows "Tu predicción: N-N" badge; Navbar Fichas counter drops by 20 immediately; reopening the match card shows read-only mode with the submitted scores.

**Why human:** DOM badge rendering, Zustand store sync visibility, real-time token deduction feedback.

---

#### 4. Locked Match and Already-Predicted Modes

**Test:** Click a live or finished match (if any exist in the DB after step 2-02). Click a match for which you already submitted a prediction.

**Expected:** Live/finished match shows "Este partido ya comenzó — no se aceptan predicciones." with disabled inputs and a Cerrar button. Already-predicted match shows read-only inputs prefilled with your scores.

**Why human:** Requires a match with status != 'scheduled' on the live DB or a way to simulate it.

---

#### 5. Leaderboard Cross-User Visibility and Scoring

**Test:** Navigate to `/tabla`. Then in the Supabase dashboard SQL editor (service-role), run `select calculate_prediction_points('<match_id>', <home>, <away>)` for a match you predicted with an exact-match score. Reload `/tabla`.

**Expected:** Before scoring: leaderboard shows all registered users (not just you). After scoring: your row shows 3 points and is highlighted in `bg-slate-700/50`; no `is_admin`, `is_blocked`, or `email` column visible in the network response.

**Why human:** Cross-user leaderboard requires multiple registered users; scoring requires the Supabase service-role SQL editor; `is_admin`/`is_blocked` absence requires network tab inspection.

---

### Gaps Summary

No code-level gaps found. All five ROADMAP Success Criteria are implemented and wired. All nine requirement IDs (CAL-01 through QUI-05) are covered.

The phase status is `human_needed` because:

1. Plan 02-02 was a human-gate DB push whose live state cannot be confirmed programmatically.
2. The `0003_phase02_fixes.sql` migration must have been applied to the live DB for CR-01 (leaderboard shows all users) and CR-02 (race-free token deduction) to work in production.
3. End-to-end browser flows (prediction badge, timezone persistence, leaderboard cross-user visibility) require visual confirmation.

**One documentation inconsistency to fix:** REQUIREMENTS.md `CAL-01` reads "All 48 group stage matches are visible" — should read "72". This does not block the phase but should be corrected before requirements are used for downstream planning.

---

_Verified: 2026-06-06T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
