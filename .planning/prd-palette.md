# PRD: Betting-App Color Palette Redesign

## Goal
Swap the generic slate/gray palette for a darker, more vivid color system inspired by leading sports betting apps (DraftKings, Stake, PrizePicks). No layout changes — colors and decorative styles only.

## Token Map (old → new)

### Backgrounds
| Old | New | Tailwind |
|-----|-----|----------|
| `bg-slate-900` (page bg) | Near-black navy | `bg-zinc-950` |
| `bg-slate-800` (cards, panels) | Dark panel | `bg-zinc-900` |
| `bg-slate-700` (inputs, inner surfaces) | Elevated surface | `bg-zinc-800` |

### Borders
| Old | New |
|-----|-----|
| `border-slate-700` | `border-zinc-700` |
| `border-slate-600` | `border-zinc-700` |

### Text
| Old | New |
|-----|-----|
| `text-slate-100` (primary) | `text-zinc-100` |
| `text-slate-300` (secondary) | `text-zinc-300` |
| `text-slate-400` (muted) | `text-zinc-400` |
| `text-slate-500` (disabled) | `text-zinc-500` |

### Accent — Green (quinielas, success, live)
| Old | New |
|-----|-----|
| `text-green-400` | `text-emerald-400` |
| `text-green-300` (hover) | `text-emerald-300` |
| `text-green-500` | `text-emerald-500` |
| `bg-green-500` (buttons) | `bg-emerald-500` |
| `bg-green-600` (button hover) | `bg-emerald-600` |
| `border-green-500` | `border-emerald-500` |
| `border-green-400` | `border-emerald-400` |
| `border-green-700` | `border-emerald-700/50` |
| `bg-green-900/50` (success banner bg) | `bg-emerald-950/80` |
| `focus:border-green-500` | `focus:border-emerald-500` |

### Tokens — Gold (fichas, balances)
Every numeric token balance display gets amber treatment:
- `text-slate-400` on token numbers → `text-amber-400`
- `text-slate-100` on token numbers in leaderboard → `text-amber-300`
- The word "fichas" label stays muted zinc

Files where token values appear: `LeaderboardPage.tsx`, `AdminReportsPage.tsx`, `TodayMatchesWidget.tsx` (no tokens), `Navbar.tsx` (token balance chip).

### Navbar — Gradient + emerald separator
- Background: `bg-zinc-950` with bottom border `border-emerald-500/20`
- Token chip: amber pill `bg-amber-500/10 text-amber-400 border border-amber-500/30`
- Active nav link: `text-emerald-400 border-b-2 border-emerald-400`

### Admin sub-nav tabs (AdminRoute)
- Active tab: `border-emerald-400 text-emerald-400` (already emerald after this change)

### Red — Losses, blocked, errors
- Keep `red-400` / `red-900/50` — already strong, no change needed

## Files to modify
1. `src/components/Navbar.tsx`
2. `src/components/AdminRoute.tsx`
3. `src/pages/CalendarPage.tsx`
4. `src/components/MatchCard.tsx`
5. `src/components/PredictionModal.tsx`
6. `src/pages/LeaderboardPage.tsx`
7. `src/pages/ApuestasPage.tsx`
8. `src/components/PoolCard.tsx`
9. `src/components/BetModal.tsx`
10. `src/pages/AdminUsersPage.tsx`
11. `src/pages/AdminMatchesPage.tsx`
12. `src/pages/AdminPoolsPage.tsx`
13. `src/pages/AdminReportsPage.tsx`
14. `src/components/TodayMatchesWidget.tsx`
15. `src/pages/LoginPage.tsx`
16. `src/pages/RegistroPage.tsx`
17. `src/pages/ResetPasswordPage.tsx`

## Rules
- Replace ALL instances of the old token — no partial migration
- Do NOT change layout, spacing, font sizes, or component structure
- Do NOT add new dependencies
- Token balances (fichas numbers): amber. Everything else non-token: zinc.
- `min-h-[calc(100vh-56px)] bg-slate-900` → `bg-zinc-950` on every page wrapper
- Navbar token chip: wrap balance in `<span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-xs font-bold">`

## Success Criteria
1. No `slate-` color class remains anywhere in `src/` (except inside comments)
2. No `green-` color class remains anywhere in `src/` (all replaced with `emerald-`)
3. Token balance numbers display in amber on Navbar and Leaderboard
4. TypeScript build passes: `tsc --noEmit`
5. No layout regressions — same structure, only colors changed
