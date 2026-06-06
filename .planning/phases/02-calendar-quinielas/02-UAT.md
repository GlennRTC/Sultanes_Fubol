---
status: testing
phase: 02-calendar-quinielas
source: [02-VERIFICATION.md]
started: 2026-06-06T00:00:00Z
updated: 2026-06-06T00:00:00Z
---

# Phase 02 UAT — Calendar + Quinielas

All code checks pass. The following 5 items require live browser + Supabase verification before the phase can be marked complete.

**Pre-requisite before items 4–5:** Push the fixes migration first:
```bash
supabase db push   # applies 0003_phase02_fixes.sql to pajowyfyvdscyqebbhkv
```

---

## UAT Checklist

### UAT-02-01: Live DB state (Plan 02-02 gate)
- [ ] `select count(*) from public.matches;` returns **72**
- [ ] `select count(distinct group_name) from public.matches;` returns **12**
- [ ] `place_prediction` and `calculate_prediction_points` visible in Database → Functions
- [ ] `0003_phase02_fixes.sql` pushed: `leaderboard_view` uses `security_invoker = false` (all users visible)

### UAT-02-02: Calendar browsing + timezone switching
- [ ] `/calendario` shows 72 matches
- [ ] Por fecha and Por grupo views both work; 12 group tabs A–L present
- [ ] Groups I–L show Argentina, Francia, Portugal, Inglaterra
- [ ] Click "Cambiar", pick "Argentina / Uruguay", times shift; persists after page refresh
- [ ] Grupo and Equipo dropdowns filter correctly; "Todos" resets the list

### UAT-02-03: Prediction flow end-to-end
- [ ] Entering a decimal (e.g. "2.5") is rejected with "Ingresa números enteros válidos"
- [ ] Valid integer scores advance to the confirm step showing the entered scoreline
- [ ] Confirmar closes the modal and shows "Tu predicción: N-N" badge on the card
- [ ] Navbar Fichas counter drops by 20 immediately
- [ ] Reopening that match card shows read-only mode with submitted scores

### UAT-02-04: Locked and already-predicted modal modes
- [ ] Clicking a live/finished match shows "Este partido ya comenzó — no se aceptan predicciones." with disabled inputs
- [ ] Clicking a match with an existing prediction shows read-only prefilled inputs

### UAT-02-05: Leaderboard cross-user visibility + scoring
- [ ] `/tabla` shows all registered users (not filtered to own row)
- [ ] Network response contains only `id, username, tokens, leaderboard_points` — no `is_admin`/`is_blocked`/`email`
- [ ] After `select calculate_prediction_points('<match_id>', <home>, <away>)` in Supabase SQL editor, `/tabla` shows 3 pts for exact match and own row is highlighted

---

## Gaps

| ID | Description | Status |
|----|-------------|--------|
| — | None — all must_haves verified in code | — |

## Documentation Fix Needed

REQUIREMENTS.md `CAL-01` reads "All **48** group stage matches are visible" — WC2026 has 72 group-stage matches (12 groups × 6). The implementation is correct; the requirements doc needs updating.
