# Phase 6 Context: Betting-App Color Palette Redesign

## Source
Parsed from `.planning/prd-palette.md`

## Phase Goal
Replace the generic slate/gray palette with a darker, more vivid system inspired by sports betting apps. No layout changes — colors and decorative styles only. All 17 source files migrated in one wave.

## Scope Fences (do NOT touch)
- Layout, spacing, font sizes, component structure
- New dependencies
- Red tones (already correct — `red-400`, `red-900/50`)
- Backend / SQL / Edge Functions

## Token Map

### Backgrounds
| Old | New |
|-----|-----|
| `bg-slate-900` | `bg-zinc-950` |
| `bg-slate-800` | `bg-zinc-900` |
| `bg-slate-700` | `bg-zinc-800` |

### Borders
| Old | New |
|-----|-----|
| `border-slate-700` | `border-zinc-700` |
| `border-slate-600` | `border-zinc-700` |

### Text
| Old | New |
|-----|-----|
| `text-slate-100` | `text-zinc-100` |
| `text-slate-300` | `text-zinc-300` |
| `text-slate-400` | `text-zinc-400` |
| `text-slate-500` | `text-zinc-500` |

### Accent Green → Emerald
| Old | New |
|-----|-----|
| `text-green-400` | `text-emerald-400` |
| `text-green-300` | `text-emerald-300` |
| `text-green-500` | `text-emerald-500` |
| `bg-green-500` | `bg-emerald-500` |
| `bg-green-600` | `bg-emerald-600` |
| `border-green-500` | `border-emerald-500` |
| `border-green-400` | `border-emerald-400` |
| `border-green-700` | `border-emerald-700/50` |
| `bg-green-900/50` | `bg-emerald-950/80` |
| `focus:border-green-500` | `focus:border-emerald-500` |
| `hover:text-green-300` | `hover:text-emerald-300` |
| `hover:bg-green-600` | `hover:bg-emerald-600` |

### Tokens — Gold (amber)
Token balance numbers in: Navbar, LeaderboardPage, AdminReportsPage
- Token balance chip in Navbar: replace plain number with `<span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-xs font-bold">{profile.tokens}</span>`
- Leaderboard tokens column: `text-zinc-400` → `text-amber-400`
- AdminReports token stats numbers: `text-zinc-100` → `text-amber-300`

### Navbar extras
- Bottom border: add `border-b border-emerald-500/20` to the nav element
- Background: `bg-zinc-950`

## Files to Modify (17 total)
```
src/components/Navbar.tsx
src/components/AdminRoute.tsx
src/components/MatchCard.tsx
src/components/PredictionModal.tsx
src/components/PoolCard.tsx
src/components/BetModal.tsx
src/components/TodayMatchesWidget.tsx
src/pages/CalendarPage.tsx
src/pages/LeaderboardPage.tsx
src/pages/ApuestasPage.tsx
src/pages/AdminUsersPage.tsx
src/pages/AdminMatchesPage.tsx
src/pages/AdminPoolsPage.tsx
src/pages/AdminReportsPage.tsx
src/pages/LoginPage.tsx
src/pages/RegistroPage.tsx
src/pages/ResetPasswordPage.tsx
```

## Success Criteria
1. No `slate-` color class remains in `src/` (except inside code comments)
2. No `green-` color class remains in `src/` (all → `emerald-`)
3. Token balances in Navbar and Leaderboard display in amber
4. `tsc --noEmit` passes (no new TS errors)
5. No layout regressions
