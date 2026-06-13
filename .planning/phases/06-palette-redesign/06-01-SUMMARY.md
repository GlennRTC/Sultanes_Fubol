---
phase: 06-palette-redesign
plan: "01"
subsystem: components
tags: [palette, ui, zinc, emerald, amber, css]
dependency_graph:
  requires: []
  provides:
    - "Migrated Navbar with zinc palette, emerald active links, amber token chip"
    - "Migrated AdminRoute with zinc bg and emerald active tab"
    - "Migrated FullScreenSpinner with zinc bg and emerald ring"
    - "Migrated ProtectedRoute with zinc bg and emerald orphan button"
    - "Migrated MatchCard with zinc/emerald palette"
    - "Migrated PredictionModal with zinc/emerald palette"
    - "Migrated PoolCard with zinc/emerald palette"
    - "Migrated BetModal with zinc/emerald palette"
    - "Migrated TodayMatchesWidget with zinc/emerald palette"
  affects:
    - "src/pages/ (Wave 2 — inherits corrected patterns)"
tech_stack:
  added: []
  patterns:
    - "zinc-950/zinc-900/zinc-800 backgrounds replacing slate-900/slate-800/slate-700"
    - "emerald-400/emerald-500 accent replacing green-400/green-500"
    - "amber chip span for token balance in Navbar (desktop + mobile)"
key_files:
  created: []
  modified:
    - src/components/Navbar.tsx
    - src/components/AdminRoute.tsx
    - src/components/FullScreenSpinner.tsx
    - src/components/ProtectedRoute.tsx
    - src/components/MatchCard.tsx
    - src/components/PredictionModal.tsx
    - src/components/PoolCard.tsx
    - src/components/BetModal.tsx
    - src/components/TodayMatchesWidget.tsx
decisions:
  - "TimezonePicker.tsx left unmigrated — not in Wave 1 scope; logged as deferred"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-13T00:16:17Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 9
---

# Phase 06 Plan 01: Component Palette Migration Summary

**One-liner:** Migrated all 9 shared component files from slate/green to zinc/emerald, with amber chip wrappers on Navbar token balance (both desktop and mobile breakpoints).

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Migrate Navbar, AdminRoute, FullScreenSpinner, ProtectedRoute | b860607 | 4 files |
| 2 | Migrate MatchCard, PredictionModal, PoolCard, BetModal, TodayMatchesWidget | b860607 | 5 files |

(Both tasks committed together as a single atomic commit per plan instructions.)

## Verification Results

**grep check (all 9 files):**
```
grep -rn "slate-\|text-green-\|bg-green-\|border-green-" src/components/*.tsx
→ 0 matches in the 9 migrated files
```

Note: `TimezonePicker.tsx` still contains slate classes — it is not in the Wave 1 file list and has been deferred (see below).

**TypeScript:**
```
./node_modules/.bin/tsc --noEmit
→ 0 errors (clean)
```

## Key Changes by File

**Navbar.tsx**
- `activeClass`: `text-green-400` → `text-emerald-400`
- `inactiveClass`: `text-slate-300` → `text-zinc-300`
- `mobileLinkClass`: `border-slate-700` → `border-zinc-700`
- `<nav>` bg: `bg-slate-800 border-b border-slate-700` → `bg-zinc-950 border-b border-emerald-500/20`
- Desktop username span: `text-slate-100` → `text-zinc-100`
- Desktop fichas span: wrapped in amber chip `bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-xs font-bold`
- Desktop sign-out: `text-slate-300` → `text-zinc-300`
- Mobile fichas span: replaced with identical amber chip (matches desktop)
- Mobile hamburger: `text-slate-300` → `text-zinc-300`
- Mobile dropdown div: `border-slate-700 bg-slate-800` → `border-zinc-700 bg-zinc-950`
- Mobile dropdown username: `text-slate-400` → `text-zinc-400`
- Mobile dropdown sign-out: `text-slate-300` → `text-zinc-300`

**AdminRoute.tsx**
- `<nav>` bg: `bg-slate-800 border-b border-slate-700` → `bg-zinc-900 border-b border-zinc-700`
- Active tab: `border-green-400 text-green-400` → `border-emerald-400 text-emerald-400`
- Inactive tab: `text-slate-400 hover:text-slate-200` → `text-zinc-400 hover:text-zinc-200`

**FullScreenSpinner.tsx**
- Outer div: `bg-slate-900` → `bg-zinc-950`
- Spinner ring: `border-green-500` → `border-emerald-500`

**ProtectedRoute.tsx**
- Orphan div: `bg-slate-900` → `bg-zinc-950`
- Orphan paragraph: `text-slate-300` → `text-zinc-300`
- Sign-out button: `text-green-400 hover:text-green-300` → `text-emerald-400 hover:text-emerald-300`

**MatchCard.tsx**
- All 12 class substitutions applied: scheduled/live/finished badges, card outer, team names, score/vs spans, time, prediction badge, venue icon and text.

**PredictionModal.tsx**
- All 25 class substitutions applied across modes (a), (b), (c): modal container, close button, heading, date, labels, readonly/locked/editable inputs, separator, cost paragraph, CTA buttons, summary paragraph.

**PoolCard.tsx**
- All 15 class substitutions applied: open/closed/resolved badges, card outer, question, status row, deadline, resolved result, winning/non-winning option labels and odds, bet badge states (won/lost/active).

**BetModal.tsx**
- All 23 class substitutions applied across modes A, B, C: modal container, close button, heading, deadline, option buttons (selected/unselected), mode A outcome paragraphs, mode B resolved options, mode C odds text, amount label, amount input, hint paragraph, CTA buttons.

**TodayMatchesWidget.tsx**
- All 13 class substitutions applied: header bar, title span, chevron SVG, collapsible body border, loading skeleton, match chip bg, live/finished/scheduled status spans, home/away team paragraphs, score paragraphs.

## Deviations from Plan

**1. [Out of Scope] TimezonePicker.tsx not migrated**
- **Found during:** Task 2 final verification grep
- **Issue:** `src/components/TimezonePicker.tsx` still contains slate- classes (`bg-slate-800`, `border-slate-700`, `text-slate-300`, `text-slate-100`, `hover:bg-slate-700`)
- **Disposition:** Out of scope — this file is not in the Wave 1 file list (`files_modified` frontmatter) and is not listed in the plan tasks. Logged to deferred-items.
- **Action needed:** Include in Wave 2 or a follow-up plan.

## Known Stubs

None — all color replacements are complete for the 9 in-scope files. No placeholder or hardcoded stub values introduced.

## Threat Flags

None — changes are purely cosmetic className string replacements. No new network endpoints, auth paths, or data flow modifications introduced.

## Self-Check: PASSED

- [x] All 9 component files verified: zero slate- or green- matches
- [x] Commit b860607 exists: `git log --oneline | grep b860607`
- [x] tsc --noEmit: 0 errors
- [x] Navbar contains "amber-400" in both desktop and mobile fichas spans
- [x] Navbar nav contains "bg-zinc-950" and "border-emerald-500/20"
- [x] FullScreenSpinner contains "border-emerald-500"
- [x] ProtectedRoute contains "emerald-400"
- [x] PoolCard contains "emerald-400" in winning option spans and bet badge spans
- [x] BetModal contains "emerald-500" in selected-option border and CTA buttons
- [x] TodayMatchesWidget contains "emerald-400" in live status span
- [x] PredictionModal contains "emerald-500" in focus:border classes and button backgrounds
