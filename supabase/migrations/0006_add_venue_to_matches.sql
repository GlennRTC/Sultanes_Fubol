-- Add venue column to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS venue text;
