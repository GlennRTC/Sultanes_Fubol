---
status: complete
phase: 02-calendar-quinielas
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-06-06T00:00:00Z
updated: 2026-06-06T00:00:00Z
---

# Phase 02 UAT — Calendar + Quinielas

## Current Test

## Current Test

[testing complete]

## Tests

### 1. Live DB State
expected: |
  supabase db push applies 0003_phase02_fixes.sql.
  Then in Supabase SQL Editor:
  - select count(*) from public.matches; → 72
  - select count(distinct group_name) from public.matches; → 12
  - place_prediction and calculate_prediction_points appear in Database → Functions
  - leaderboard_view definition shows security_invoker = false (not the default SECURITY INVOKER)
result: pass

### 2. Calendar Browsing + Timezone Switching
expected: |
  - /calendario loads and shows 72 match cards
  - "Por fecha" and "Por grupo" toggle both work
  - "Por grupo" shows 12 group tabs labeled A through L
  - Groups I–L contain Argentina, Francia, Portugal, and Inglaterra respectively
  - Clicking "Cambiar" opens TimezonePicker; selecting "Argentina / Uruguay (UTC-3)" shifts all match times; refreshing the page keeps the new timezone
  - Grupo and Equipo dropdowns filter the list; selecting "Todos" resets to all matches
result: pass

### 3. Prediction Flow End-to-End
expected: |
  - Clicking a scheduled match opens PredictionModal
  - Typing "2.5" in a score field and clicking Confirmar predicción shows the error "Ingresa números enteros válidos (0 o más)." — no step advance
  - With valid integers (e.g. 2 and 1), clicking Confirmar predicción shows the confirm step with the scoreline displayed (e.g. "México 2 – 1 Ecuador")
  - Clicking Confirmar on the confirm step closes the modal and shows a green "Tu predicción: 2-1" badge on the match card
  - The Fichas counter in the Navbar drops by 20 immediately (no page reload needed)
  - Clicking the same match card again opens a read-only modal showing the submitted scores
result: pass

### 4. Locked and Already-Predicted Modal Modes
expected: |
  - Clicking a match with status "en_vivo" or "finalizado" opens the modal with the message "Este partido ya comenzó — no se aceptan predicciones." and score inputs are disabled/absent
  - Clicking a match that already has a submitted prediction opens a read-only modal prefilled with those scores (not an editable form)
result: pass

### 5. Leaderboard Cross-User Visibility + Scoring
expected: |
  - /tabla shows all registered users (not just the logged-in user's own row)
  - Checking the network response for the leaderboard_view query: fields present are id, username, tokens, leaderboard_points only — is_admin, is_blocked, email are absent
  - After running select calculate_prediction_points('<match_id>', <home_score>, <away_score>); in Supabase SQL Editor for an exact prediction match, /tabla shows 3 points for that user
  - The logged-in user's own row has a visible highlight (green background or border) in the leaderboard
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
