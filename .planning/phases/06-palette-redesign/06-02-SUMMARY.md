---
phase: 06-palette-redesign
plan: "02"
subsystem: ui-pages
tags: [palette, zinc, emerald, amber, pages]
dependency_graph:
  requires: [06-01]
  provides: [full-palette-migration]
  affects: [all-pages, App.tsx, TimezonePicker.tsx]
tech_stack:
  added: []
  patterns: [tailwind-token-swap]
key_files:
  created: []
  modified:
    - src/pages/CalendarPage.tsx
    - src/pages/LeaderboardPage.tsx
    - src/pages/ApuestasPage.tsx
    - src/pages/AdminUsersPage.tsx
    - src/pages/AdminMatchesPage.tsx
    - src/pages/AdminPoolsPage.tsx
    - src/pages/AdminReportsPage.tsx
    - src/pages/LoginPage.tsx
    - src/pages/RegistroPage.tsx
    - src/pages/ResetPasswordPage.tsx
    - src/App.tsx
    - src/components/TimezonePicker.tsx
    - src/pages/HomePage.tsx
decisions:
  - "Applied amber-300 to AdminReports stat card numbers (not amber-400) per CONTEXT.md Tokens section"
  - "Applied amber-400 to LeaderboardPage tokens column per CONTEXT.md spec"
  - "Fixed TimezonePicker.tsx, App.tsx, and HomePage.tsx to satisfy final zero-match grep requirement"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-13T00:28:00Z"
  tasks_completed: 2
  files_modified: 13
---

# Phase 6 Plan 02: Page Palette Migration Summary

**One-liner:** Full page-layer palette swap from slate/green to zinc/emerald/amber completing the FUBOL betting-app visual redesign.

## What Was Built

Migrated all 10 page files plus 3 additional files (TimezonePicker.tsx, App.tsx, HomePage.tsx) from the slate/green palette to the zinc/emerald/amber system. Every className string was updated per the token map in CONTEXT.md.

### Task 1: Five core pages

- **CalendarPage.tsx** — bg-zinc-950 root, zinc text/borders, emerald spinner/buttons/focus rings, emerald-300 Cambiar link, zinc-800 toggle active state
- **LeaderboardPage.tsx** — zinc backgrounds/borders/text, emerald-500 spinner, **tokens column text-amber-400**
- **ApuestasPage.tsx** — bg-zinc-950, zinc text, zinc-300 section headings
- **AdminUsersPage.tsx** — bg-zinc-950, emerald-950/80 success banner, emerald-400 tokens cell and status badge, emerald-800 unblock button, emerald-500 submit CTA, zinc inputs/selects
- **AdminMatchesPage.tsx** — bg-zinc-950, emerald-950/80 success banner, emerald-400 live status, emerald-500 Registrar button, zinc score inputs

### Task 2: Five more pages plus final verification

- **AdminPoolsPage.tsx** — bg-zinc-950, emerald-950/80 success banner, zinc-800 inputs/selects, emerald-400 Agregar opción link, emerald-500 create CTA, zinc-700 resolve button
- **AdminReportsPage.tsx** — bg-zinc-950, **stat card numbers text-amber-300**, zinc backgrounds/borders/text, emerald-400 leaderboard points column
- **LoginPage.tsx** — emerald-400 Volleyball icon and tagline, bg-zinc-900 form card, emerald-950/80 success banner, zinc inputs, emerald focus rings, bg-zinc-900/70 info card with border-emerald-500/20, emerald-400 feature icons and highlight spans
- **RegistroPage.tsx** — bg-zinc-950 root, bg-zinc-900 form card, zinc inputs with emerald focus, emerald-500 submit button
- **ResetPasswordPage.tsx** — bg-zinc-950 root, bg-zinc-900 form card, zinc inputs, emerald focus rings, emerald-500 submit, emerald-400 Volver links

### Deviation fixes (outside 10-file scope)

Three files were not in the original plan's file list but contained slate- classes that blocked the final zero-match grep requirement:

- **TimezonePicker.tsx** — explicitly deferred from Wave 1 (06-01-SUMMARY noted this); fixed bg-slate-800→bg-zinc-900, border-slate-700→border-zinc-700, text-slate-300→text-zinc-300, text-slate-100→text-zinc-100, hover:bg-slate-700→hover:bg-zinc-800
- **App.tsx** — single `bg-slate-900` on the main layout wrapper → `bg-zinc-950`
- **HomePage.tsx** — placeholder page with bg-slate-900 and text-slate-100 → bg-zinc-950 and text-zinc-100

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Coverage] Fixed TimezonePicker.tsx, App.tsx, HomePage.tsx to satisfy final verification**
- **Found during:** Task 2 final grep
- **Issue:** Plan's success criterion requires zero slate-/green- matches across all src/. Three files outside the 10-file list still had slate- classes.
- **Fix:** Applied token map to all three files. TimezonePicker.tsx was explicitly deferred from Wave 1 with intent to fix in Wave 2; App.tsx had one bg-slate-900 on the main layout wrapper; HomePage.tsx is a placeholder with two slate classes.
- **Files modified:** src/components/TimezonePicker.tsx, src/App.tsx, src/pages/HomePage.tsx
- **Commit:** 6e82b72 (included in the same commit)

**2. [Rule 1 - Bug] LoginPage.tsx missing text-slate-300 → text-zinc-300 on info card paragraph**
- **Found during:** Task 2 final grep
- **Issue:** The `<p>` element wrapping the info card body text used `text-slate-300` instead of being replaced by `text-zinc-300` per the token map (plan item 24 specified this as `text-slate-300` → `text-zinc-300`).
- **Fix:** Changed `text-slate-300` to `text-zinc-300` on line 182.
- **Files modified:** src/pages/LoginPage.tsx
- **Commit:** 6e82b72

## Verification Results

```
grep -rn "slate-\|text-green-\|bg-green-\|border-green-" src/ --include="*.tsx" --include="*.ts"
# → zero matches

./node_modules/.bin/tsc --noEmit
# → zero errors (clean exit)
```

### Specific Success Criteria Verified

| Criterion | Status |
|-----------|--------|
| LeaderboardPage tokens column is `text-amber-400` | PASS |
| AdminReports stat card numbers are `text-amber-300` | PASS |
| AdminUsers tokens cell is `text-emerald-400` | PASS |
| AdminUsers "Activo" badge is `text-emerald-400` | PASS |
| LoginPage info card border is `border-emerald-500/20` | PASS |
| Final grep across all src/ returns zero matches | PASS |
| tsc --noEmit exits with no new errors | PASS |

## Known Stubs

None — this plan is purely cosmetic className changes; no data wiring or placeholder text introduced.

## Threat Flags

None — color-only edits with no behavior, auth, or data flow changes.

## Self-Check: PASSED

- All 13 modified files confirmed changed (git log shows 186 insertions, 186 deletions in commit 6e82b72)
- Commit 6e82b72 confirmed via `git rev-parse --short HEAD`
- Zero grep matches confirmed
- tsc --noEmit confirmed clean
