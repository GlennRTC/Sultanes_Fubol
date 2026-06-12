-- Migration: 0009_live_scores
-- Purpose: Add external_match_id column for football-data.org match IDs,
-- create a fast-lookup index, and enroll the matches table in Supabase Realtime
-- so TodayMatchesWidget can subscribe to live score updates.

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS external_match_id integer;

CREATE INDEX IF NOT EXISTS matches_external_id_idx ON public.matches (external_match_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
