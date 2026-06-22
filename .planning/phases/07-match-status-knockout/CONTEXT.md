# Phase 7 Context: Live/Finished Match Treatment + Knockout-Stage Support

## Source
User request in conversation, clarified via AskUserQuestion. No PRD file — context captured directly.

## Phase Goal
1. Live matches are visually highlighted on the calendar (pulsing glow), finished matches are collapsed into an accordion per date group.
2. Admins can create new matches through the UI (not just the seed file) so knockout-stage fixtures can be entered once both teams are confirmed.

## Locked Decisions (from AskUserQuestion)

1. **Live highlight**: Glow + pulse border on `MatchCard` — emerald pulsing border/glow, reusing the CSS keyframe pattern already established for the leaderboard fire/ice effect (`src/index.css`). Live matches stay in their existing date group (not pulled into a separate section).
2. **Finished matches**: Collapsible accordion per date group — finished matches within a date group are hidden under a "Partidos finalizados" toggle, collapsed by default. Same UX pattern as `TodayMatchesWidget` (chevron icon, localStorage NOT required — local component state is fine since this is per-page, not persisted across visits). Tapping a finished match still opens `PredictionModal` to review the prediction vs. result.
3. **Knockout matchup timing**: Admin enters the real matchup (e.g. "México vs Brasil") only once both teams are confirmed — exactly like group-stage matches. No placeholder/TBD card logic, no schema changes for "pending team" state.
4. **Penalty-shootout scoring**: No change. Predictions are scored on the 90-minute regulation score only, identical to existing `place_prediction` / `calculate_prediction_points` logic. Do not add a "who advances" pick.
5. **Admin match creation**: Build a "Crear partido" form in the admin panel (extends `AdminMatchesPage.tsx` or a new tab) backed by a new `admin_create_match` RPC. This replaces manual SQL inserts for knockout fixtures going forward.

## Scope Fences (do NOT touch)
- Prediction scoring logic (`place_prediction`, `calculate_prediction_points`) — unchanged
- Bet pools / apuestas module — unrelated
- `group_name` stays a free-text column — knockout rounds use string labels like `'R16'`, `'QF'`, `'SF'`, `'F'` (no enum, no new column)
- No new dependencies
- Existing seed file (`matches_wc2026.sql`) — do not modify for this phase; knockout matches are added live via the new admin form, not via seed

## Technical Notes

### Live highlight (MatchCard + index.css)
- Add new keyframe (e.g. `live-glow`) to `src/index.css` near the existing `fire-row-glow` / `ice-row-glow` keyframes — pulsing emerald `box-shadow` / border, ~2s cycle.
- Apply via a conditional class on the card's root div when `match.status === 'live'`.

### Finished accordion (CalendarPage)
- Currently `CalendarPage.tsx` groups matches by local date via `groupMatchesByLocalDate()` and renders all matches in a date group via `.map()`.
- Within each date group, split `dayMatches` into `liveOrScheduled` (status !== 'finished') and `finishedMatches` (status === 'finished').
- Render `liveOrScheduled` directly (existing behavior).
- Render `finishedMatches` under a collapsible toggle, default closed, only if `finishedMatches.length > 0`. Use local `useState<Set<string>>` or per-date-key open/closed map (component-level state, not localStorage — this list changes daily and persisting it adds little value).
- Apply same logic to "Por grupo" view's match list (split into live/scheduled vs finished within the active group).

### Admin match creation (new RPC + AdminMatchesPage)
- New migration file (next number after `0009_live_scores.sql` → `0010_admin_create_match.sql`):
  ```sql
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
  ```
  - Follows the exact security pattern in `0007_admin_panel.sql`: null-check `auth.uid()`, `private.is_admin()` guard, business logic, `admin_logs` insert. No exceptions.
- Add `admin_create_match` to `Database.public.Functions` in `src/types/index.ts`.
- `AdminMatchesPage.tsx`: add a form above (or in a collapsible section above) the existing results list — inputs for home team, away team, round/group label (free text, with a hint like "A–L para grupos, o R16/QF/SF/F para eliminatorias"), datetime picker, optional venue. Submit calls `supabase.rpc('admin_create_match', {...})`. On success, show confirmation and prepend to the local matches list (or refetch).
- Datetime input: reuse whatever pattern exists for entering UTC-aware datetimes elsewhere in admin pages (check `AdminPoolsPage.tsx` deadline input for the established pattern — likely a `datetime-local` input converted to UTC ISO string).

## Success Criteria
1. A live match's `MatchCard` shows a pulsing emerald glow/border, visually distinct from scheduled/finished cards.
2. Within each date group on `/calendario` (both "Por fecha" and "Por grupo" views), finished matches are collapsed under a closed-by-default toggle; live/scheduled matches remain directly visible.
3. Tapping a finished match inside the collapsed section still opens `PredictionModal` showing the prediction vs. final score.
4. An admin can create a new match (e.g. a Round of 16 fixture) via a form in the admin panel — no SQL required.
5. `admin_create_match` enforces admin-only access and logs to `admin_logs`, consistent with every other admin RPC.
6. `tsc --noEmit` passes. No regressions to existing prediction flow or group-stage match display.
