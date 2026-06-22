-- Migration: 0010_admin_create_match
-- Purpose: Add the admin_create_match SECURITY DEFINER RPC so admins can create
-- new matches (group-stage or knockout-stage) from the admin panel UI instead of
-- manual SQL inserts via the seed file. This is the DB foundation for knockout
-- fixtures, which are entered once both teams are confirmed (CONTEXT.md D-05).
--
-- SECURITY: Follows the exact pattern established in 0007_admin_panel.sql:
--   (1) null-check auth.uid(), (2) private.is_admin() guard, (3) business logic,
--   (4) admin_logs INSERT. No exceptions.
-- group_name stays free-text — no enum, no schema change for knockout rounds
-- (e.g. 'R16', 'QF', 'SF', 'F') or for a "pending team" state.

create or replace function public.admin_create_match(
  p_home_team text,
  p_away_team text,
  p_group_name text,
  p_match_datetime timestamptz,
  p_venue text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not private.is_admin() then
    raise exception 'not_admin';
  end if;
  if p_home_team is null or p_away_team is null or trim(p_home_team) = '' or trim(p_away_team) = '' then
    raise exception 'invalid_teams';
  end if;

  insert into public.matches (home_team, away_team, group_name, match_datetime, venue, status)
  values (p_home_team, p_away_team, p_group_name, p_match_datetime, p_venue, 'scheduled')
  returning id into v_match_id;

  insert into public.admin_logs (admin_id, action, target_user_id, details)
  values (auth.uid(), 'create_match', null, jsonb_build_object(
    'match_id', v_match_id, 'home_team', p_home_team, 'away_team', p_away_team,
    'group_name', p_group_name, 'match_datetime', p_match_datetime
  ));

  return v_match_id;
end;
$$;

revoke execute on function public.admin_create_match(text, text, text, timestamptz, text) from public, anon;
grant execute on function public.admin_create_match(text, text, text, timestamptz, text) to authenticated;
