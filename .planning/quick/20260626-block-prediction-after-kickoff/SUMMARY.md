---
slug: block-prediction-after-kickoff
status: complete
---

# Summary: Block predictions once a match has kicked off

## Root cause

`place_prediction` (backend) and `PredictionModal.isLocked` (frontend) both gated only on
`matches.status = 'scheduled'`. That column only flips to `'live'` via the `sync-live-scores`
cron (every 2 min, dependent on football-data.org) or to `'finished'` when an admin manually
records the result. If the cron lagged or never ran, predictions stayed open through the
whole match.

## Fix

Added a `match_datetime <= now()` check alongside the existing status check, in both layers:

- **Backend** (authoritative): `supabase/migrations/0011_lock_prediction_by_datetime.sql` —
  replaces `place_prediction` with the same logic plus `v_match_datetime <= now()` in the
  guard. Same exception name (`match_not_scheduled`) so the frontend's existing error
  message still applies.
- **Frontend** (UX, locks the form instantly without waiting on a status refetch):
  `src/components/PredictionModal.tsx` — `isLocked` is now
  `match.status !== 'scheduled' || new Date(match.match_datetime) <= new Date()`.

## Manual step required

This environment has no Supabase DB credentials. Apply the migration manually:

1. Open Supabase Dashboard → SQL Editor.
2. Paste and run the full contents of `supabase/migrations/0011_lock_prediction_by_datetime.sql`.
3. Verify: `select proname from pg_proc where proname = 'place_prediction';` returns one row.
4. Optional manual test: as a non-admin user, try `place_prediction` against a match whose
   `match_datetime` is in the past but `status` is still `'scheduled'` — should now raise
   `match_not_scheduled`.

## Verification

`./node_modules/.bin/tsc --noEmit` — zero errors.

## Files changed

- `supabase/migrations/0011_lock_prediction_by_datetime.sql` (new)
- `src/components/PredictionModal.tsx`
