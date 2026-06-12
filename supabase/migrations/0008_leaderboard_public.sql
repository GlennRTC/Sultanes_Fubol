-- Migration: 0008_leaderboard_public
-- Fix: leaderboard_view queries profiles which has row-level security.
-- Regular users only have profiles_select_own policy, so the view returns only
-- their own row. A SECURITY DEFINER function runs as the function owner (postgres),
-- which bypasses RLS, and exposes only the safe leaderboard columns.

create or replace function public.get_leaderboard()
returns table (
  id                uuid,
  username          text,
  tokens            integer,
  leaderboard_points integer
)
language sql
security definer
set search_path = public
stable
as $$
  select id, username, tokens, leaderboard_points
  from public.profiles
  order by leaderboard_points desc, tokens desc;
$$;

revoke execute on function public.get_leaderboard() from public, anon;
grant execute on function public.get_leaderboard() to authenticated;
