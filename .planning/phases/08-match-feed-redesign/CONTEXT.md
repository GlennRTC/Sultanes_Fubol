# Phase 8 Context: Match Feed Redesign — Live-First, Compact Finished

## Source
User request in conversation, clarified via AskUserQuestion. No PRD file — context captured directly. Visual inspiration: Prodefy (prodefy.co) and FIFA World Cup 2026 Match Predictor (play.fifa.com/match-predictor) — both use a live-first feed with compact finished-match rows. No pixel-level mockup was extracted (text-only web search); the brief below describes the structural pattern, not an exact visual clone.

## Phase Goal
Replace the current date-grouped match list with a status-ordered feed: live matches first (large cards, existing glow), scheduled matches next (chronological), finished matches always-visible in a compact single-line row at the bottom. Applies to both "Por fecha" and "Por grupo" views.

## Locked Decisions (from AskUserQuestion)

1. **Global feed ordering, not per-date-group floating**: The date-grouped structure (`groupMatchesByLocalDate` + per-day `<h2>` headers) is replaced as the *primary* ordering mechanism. New order across the whole filtered list: `live` → `scheduled` (chronological) → `finished` (chronological, compact). Date is no longer a section header — it moves inline into each card (already partially true via `MatchCard`'s `displayTime`, which shows `d MMM · HH:mm zzz`).
2. **Finished matches are always visible, no toggle**: The Phase 7 collapsible "Partidos finalizados" accordion (`openFinished` state, toggle button, chevron) is removed. Finished matches render unconditionally in a new compact row component — no expand/collapse interaction.
3. **New compact row format for finished matches**: bandera · equipo · marcador · equipo · bandera, single line, no venue, no meta row, no status badge text (the position in the feed already implies "finished"). Tapping still opens `PredictionModal` with the existing prediction-vs-result view — behavior unchanged, only the visual size shrinks.
4. **Applies to both views**: "Por fecha" (now a flat status-ordered feed, no date headers) and "Por grupo" (existing A–L tabs stay, but the matches within the active group are reordered live → scheduled → finished-compact, same as the main feed).

## Scope Fences (do NOT touch)
- Prediction scoring logic (`place_prediction`, `calculate_prediction_points`) — unchanged
- `PredictionModal` — unchanged, still opened the same way for any match regardless of status
- Filter bar (Grupo / Equipo selects) — unchanged, still filters the underlying match list before the status-ordering split
- `TodayMatchesWidget` — separate component, untouched
- `MatchCard`'s live-glow styling (`.live-glow` class, Phase 7) — reused as-is for the live section
- No new dependencies
- Admin pages, bet pools, leaderboard — unrelated, untouched

## Technical Notes

### Removing date-grouping as primary structure (CalendarPage.tsx)
- Delete or repurpose `groupMatchesByLocalDate()` — no longer used to build section headers. (Keep `formatDateHeader` logic available if needed inline in cards, though `MatchCard`'s existing `displayTime` already shows the date via `d MMM · HH:mm zzz` — likely no new date-formatting code needed.)
- Remove the `openFinished` Set state and `toggleFinished()` function (Phase 7 addition) — no longer needed since finished matches have no toggle.
- New derived data per view:
  ```ts
  const live = filteredMatches.filter(m => m.status === 'live');
  const scheduled = filteredMatches.filter(m => m.status === 'scheduled')
    .sort((a, b) => new Date(a.match_datetime).getTime() - new Date(b.match_datetime).getTime());
  const finished = filteredMatches.filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.match_datetime).getTime() - new Date(a.match_datetime).getTime()); // most recently finished first
  ```
- Render order: `live.map(MatchCard)` → `scheduled.map(MatchCard)` → (visual separator/label, e.g. small "Finalizados" label, not a toggle) → `finished.map(FinishedMatchRow)`.
- Apply the identical live/scheduled/finished split inside the "Por grupo" view's active-group match list (replacing its own Phase 7 accordion logic).

### New compact component: FinishedMatchRow.tsx
- New file `src/components/FinishedMatchRow.tsx`, sibling to `MatchCard.tsx`.
- Props: same shape as `MatchCard` (`match`, `prediction`, `timezone`, `onCardClick`) for drop-in consistency.
- Layout: single flex row — `[flag] [home team abbreviated or truncated] [score] [away team] [flag]`, small text size (e.g. `text-xs`/`text-sm`), reduced padding (e.g. `py-2 px-3` vs `MatchCard`'s `px-4 py-3`), no venue row, no status badge, optional tiny prediction indicator (small emerald dot or the existing prediction pill shrunk down) if the user predicted.
- Reuse `getCountryCode` from `src/lib/countryCode.ts` for flags, same as `MatchCard`.
- Keep `onClick`/`onKeyDown` → `onCardClick(match)` wiring identical to `MatchCard` so `PredictionModal` opens the same way.
- Tailwind palette: zinc/emerald, consistent with Phase 6 redesign (no new colors).

### MatchCard.tsx
- No structural changes expected — it continues to render live and scheduled matches exactly as today (including the live-glow class from Phase 7). Confirm `displayTime` format remains adequate as the only date indicator now that there's no section header.

### CalendarPage.tsx — view label clarity
- Since "Por fecha" no longer groups by date, consider renaming or keeping the label as-is — out of scope to rename UI copy unless the planner/executor finds it necessary for clarity; do not over-engineer this.

## Success Criteria
1. On `/calendario`, live matches render at the top in their existing full-size glowing cards.
2. Scheduled matches render next, in chronological order, in their existing full-size cards.
3. Finished matches render at the bottom, always visible (no toggle/accordion), in a new compact single-line row format.
4. Tapping any finished match row still opens `PredictionModal` showing the prediction vs. final score, identical behavior to before.
5. The same live → scheduled → finished ordering applies inside the "Por grupo" view's active group.
6. The Grupo/Equipo filter bar still works — filtering happens before the status split.
7. The Phase 7 "Partidos finalizados" toggle/accordion code is fully removed (no dead code left behind).
8. `tsc --noEmit` passes. No regressions to prediction submission flow.
