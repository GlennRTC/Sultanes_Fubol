# Phase 2: Calendar + Quinielas - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 13
**Analogs found:** 10 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/pages/CalendarPage.tsx` | page | request-response (fetch-on-mount) | `src/pages/LoginPage.tsx` | role-match |
| `src/pages/LeaderboardPage.tsx` | page | request-response (fetch-on-mount) | `src/pages/LoginPage.tsx` | role-match |
| `src/components/MatchCard.tsx` | component | transform (display) | `src/components/Navbar.tsx` | partial |
| `src/components/PredictionModal.tsx` | component | request-response (RPC) | `src/pages/RegistroPage.tsx` | role-match (form + async submit + error) |
| `src/components/TimezonePicker.tsx` | component | event-driven (localStorage) | `src/components/Navbar.tsx` | partial |
| `src/store/authStore.ts` | store | event-driven | `src/store/authStore.ts` (self) | exact (extend) |
| `src/types/index.ts` | types | n/a | `src/types/index.ts` (self) | exact (extend) |
| `src/App.tsx` | config/router | event-driven | `src/App.tsx` (self) | exact (extend) |
| `src/components/Navbar.tsx` | component | event-driven | `src/components/Navbar.tsx` (self) | exact (extend) |
| `supabase/migrations/0002_matches_predictions.sql` | migration | CRUD | `supabase/migrations/0001_profiles.sql` | exact |
| `supabase/seed/matches_wc2026.sql` | seed | batch | `supabase/migrations/0001_profiles.sql` (structure) | partial |
| `supabase/migrations/0002_matches_predictions.sql` (SQL functions) | migration | CRUD + atomic | `supabase/migrations/0001_profiles.sql` | role-match |

---

## Pattern Assignments

### `src/pages/CalendarPage.tsx` (page, fetch-on-mount)

**Analog:** `src/pages/LoginPage.tsx`

**Imports pattern** (LoginPage.tsx lines 1-4):
```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
```

For CalendarPage, adapt to:
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { formatInTimeZone } from 'date-fns-tz';
import { toZonedTime, format } from 'date-fns-tz';   // toZonedTime for grouping keys
import { format as dateFnsFormat } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Match, Prediction } from '../types/index';
```

**Fetch-on-mount pattern** (LoginPage.tsx shows async useEffect + loading state; map to data fetch):
```typescript
// From LoginPage.tsx lines 33-34 (local loading state pattern):
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

// CalendarPage fetch-on-mount:
useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const [{ data: matchData, error: matchError }, { data: predData }] = await Promise.all([
      supabase.from('matches').select('*').order('match_datetime'),
      supabase.from('predictions').select('*'),
    ]);
    if (matchError) {
      setError('No se pudo cargar el calendario. Intenta de nuevo.');
    } else {
      setMatches(matchData ?? []);
      setPredictions(predData ?? []);
    }
    setLoading(false);
  }
  fetchData();
}, []);
```

**Error banner pattern** (LoginPage.tsx lines 77-84):
```tsx
{error && (
  <div
    role="alert"
    className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4"
  >
    <p className="text-sm text-red-300">{error}</p>
  </div>
)}
```

**Loading spinner pattern** (LoginPage.tsx lines 135-138):
```tsx
{loading ? (
  <span className="flex items-center justify-center gap-2">
    <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
  </span>
) : (
  /* content */
)}
```

**Page wrapper pattern** (LoginPage.tsx line 60 — adapt bg to match authenticated page shell):
```tsx
// Full page uses bg-slate-900 (App.tsx line 59 sets this on <main>)
// Card/panel: bg-slate-800 border border-slate-700 rounded-xl p-8
```

---

### `src/pages/LeaderboardPage.tsx` (page, fetch-on-mount)

**Analog:** `src/pages/LoginPage.tsx`

**Imports pattern:**
```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../types/index';
```

**Fetch-on-mount pattern** — same loading/error/fetch structure as CalendarPage above.

**Leaderboard query:**
```typescript
// Fetch from leaderboard_view (created in migration — exposes username, tokens, leaderboard_points)
const { data, error } = await supabase
  .from('leaderboard_view')
  .select('id, username, tokens, leaderboard_points')
  .order('leaderboard_points', { ascending: false })
  .limit(100);
```

**Table rendering** — use bg-slate-800 panel with text hierarchy from established palette:
```tsx
// Header: text-slate-100
// Body rows: text-slate-300, even rows bg-slate-800/50, odd rows bg-slate-800
// Accent (tokens): text-green-400
// Rank column: text-slate-400
```

---

### `src/components/MatchCard.tsx` (component, transform/display)

**Analog:** `src/components/Navbar.tsx` (closest existing component structure)

**Component signature pattern** (Navbar.tsx lines 1, 7):
```typescript
// Named export, props via function parameter destructuring
export function MatchCard({ match, prediction, onCardClick }: MatchCardProps) {
```

**Tailwind palette** (Navbar.tsx lines 11-26 establish the card/surface patterns):
```tsx
// Card surface: bg-slate-800 border border-slate-700 rounded-lg
// Status badge "Programado": bg-slate-700 text-slate-300
// Status badge "En vivo":    bg-yellow-900/50 border border-yellow-700 text-yellow-300
// Status badge "Finalizado": bg-slate-700 text-slate-400
// Prediction badge:          bg-green-900/50 border border-green-700 text-green-300
// Token/accent color:        text-green-400  (matches Navbar "Fichas" display)
```

**Match time display using date-fns-tz v3** (RESEARCH.md verified pattern):
```typescript
import { formatInTimeZone } from 'date-fns-tz';

const displayTime = formatInTimeZone(
  new Date(match.match_datetime),
  userTimezone,
  'd MMM · HH:mm zzz'
);
// Result: "11 Jun · 14:00 CST"
```

**Prediction badge display:**
```tsx
{prediction && (
  <span className="text-xs bg-green-900/50 border border-green-700 rounded px-2 py-0.5 text-green-300">
    Tu predicción: {prediction.home_score_prediction}-{prediction.away_score_prediction}
  </span>
)}
```

---

### `src/components/PredictionModal.tsx` (component, request-response/RPC)

**Analog:** `src/pages/RegistroPage.tsx` — best analog for a two-step async form with validation and error handling.

**Two-step confirmation state pattern** (RegistroPage.tsx lines 36-41 show multi-state form):
```typescript
// RegistroPage uses multiple useState for form state — map to modal steps:
const [step, setStep] = useState<'input' | 'confirm' | 'submitting'>('input');
const [homeScore, setHomeScore] = useState('');
const [awayScore, setAwayScore] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
```

**Form input pattern** (RegistroPage.tsx lines 135-148):
```tsx
<input
  id="home-score"
  type="number"
  min="0"
  max="99"
  value={homeScore}
  onChange={(e) => setHomeScore(e.target.value)}
  disabled={isLocked || step === 'confirm'}
  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
/>
```

**Async submit with RPC** (RegistroPage.tsx lines 53-111 show the async submit pattern; adapt to RPC):
```typescript
async function handleConfirm() {
  setLoading(true);
  setError('');
  const { error: rpcError } = await supabase.rpc('place_prediction', {
    p_match_id: match.id,
    p_home_score: parseInt(homeScore),
    p_away_score: parseInt(awayScore),
  });
  if (rpcError) {
    if (rpcError.message.includes('insufficient_tokens')) {
      setError('No tienes suficientes fichas para hacer esta predicción.');
    } else if (rpcError.message.includes('match_not_scheduled')) {
      setError('Este partido ya comenzó — no se aceptan predicciones.');
    } else if (rpcError.code === '23505') {
      setError('Ya tienes una predicción para este partido.');
    } else {
      setError('No se pudo guardar tu predicción. Intenta de nuevo.');
    }
    setStep('input');
    setLoading(false);
  } else {
    // Update Zustand store before closing (Pitfall 5 prevention)
    useAuthStore.getState().updateTokens(-20);
    onSuccess({ home_score_prediction: parseInt(homeScore), away_score_prediction: parseInt(awayScore) });
    onClose();
  }
}
```

**Error banner pattern** (RegistroPage.tsx lines 119-127 — identical to LoginPage):
```tsx
{error && (
  <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
    <p className="text-sm text-red-300">{error}</p>
  </div>
)}
```

**Submit button loading state** (RegistroPage.tsx lines 194-210):
```tsx
<button
  type="button"
  disabled={loading}
  aria-busy={loading}
  aria-disabled={loading}
  className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-6 py-3 rounded-lg"
>
  {loading ? (
    <span className="flex items-center justify-center gap-2">
      <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
    </span>
  ) : (
    'Confirmar'
  )}
</button>
```

**Modal overlay pattern** — no existing modal in codebase; use standard Tailwind fixed overlay:
```tsx
// Modal backdrop: fixed inset-0 bg-black/60 flex items-center justify-center z-50
// Modal panel:    bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-[400px] mx-4
```

---

### `src/components/TimezonePicker.tsx` (component, event-driven/localStorage)

**Analog:** `src/components/Navbar.tsx` (closest component; simple stateless-style component)

**Component export pattern** (Navbar.tsx line 7):
```typescript
export function TimezonePicker({ current, onSelect }: TimezonePickerProps) {
```

**Select/dropdown pattern** (RegistroPage.tsx does not have a select; use form input pattern as base):
```tsx
// Use native <select> — no custom dropdown library
<select
  value={current}
  onChange={(e) => onSelect(e.target.value)}
  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
>
  {SUPPORTED_TIMEZONES.map(({ label, iana }) => (
    <option key={iana} value={iana}>{label}</option>
  ))}
</select>
```

**SUPPORTED_TIMEZONES constant** (from RESEARCH.md, D-16):
```typescript
export const SUPPORTED_TIMEZONES = [
  { label: 'México (Centro)',      iana: 'America/Mexico_City' },
  { label: 'México (Pacífico)',    iana: 'America/Mazatlan' },
  { label: 'México (Cancún)',      iana: 'America/Cancun' },
  { label: 'Colombia',             iana: 'America/Bogota' },
  { label: 'Perú',                 iana: 'America/Lima' },
  { label: 'Ecuador',              iana: 'America/Guayaquil' },
  { label: 'Venezuela',            iana: 'America/Caracas' },
  { label: 'Bolivia',              iana: 'America/La_Paz' },
  { label: 'Chile',                iana: 'America/Santiago' },
  { label: 'Argentina / Uruguay',  iana: 'America/Argentina/Buenos_Aires' },
  { label: 'Paraguay',             iana: 'America/Asuncion' },
  { label: 'Cuba',                 iana: 'America/Havana' },
  { label: 'España (Península)',   iana: 'Europe/Madrid' },
  { label: 'España (Canarias)',    iana: 'Atlantic/Canary' },
  { label: 'UTC',                  iana: 'UTC' },
];
```

**Timezone detection with localStorage fallback** (RESEARCH.md Code Examples):
```typescript
const STORAGE_KEY = 'fubol_timezone';
const SUPPORTED_IANA_SET = new Set(SUPPORTED_TIMEZONES.map(t => t.iana));

export function detectTimezone(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_IANA_SET.has(stored)) return stored;
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (SUPPORTED_IANA_SET.has(detected)) return detected;
  return 'UTC';
}

export function saveTimezone(iana: string): void {
  localStorage.setItem(STORAGE_KEY, iana);
}
```

---

### `src/store/authStore.ts` — EXTEND (store, event-driven)

**Analog:** `src/store/authStore.ts` (self — add `updateTokens` action)

**Existing interface** (authStore.ts lines 5-13):
```typescript
interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  // ADD:
  updateTokens: (delta: number) => void;
}
```

**New action implementation** (follows existing setter pattern at authStore.ts lines 19-25):
```typescript
updateTokens: (delta) => set((state) => ({
  profile: state.profile
    ? { ...state.profile, tokens: state.profile.tokens + delta }
    : null,
})),
```

**Usage from PredictionModal after successful RPC:**
```typescript
useAuthStore.getState().updateTokens(-20);
```

---

### `src/types/index.ts` — EXTEND (types)

**Analog:** `src/types/index.ts` (self — append new types)

**Existing pattern to follow** (index.ts lines 44-55 — plain interface style, no decorators):
```typescript
export interface Profile {
  id: string;
  username: string;
  tokens: number;
  is_admin: boolean;
  is_blocked: boolean;
}
```

**New types to append** (RESEARCH.md Code Examples section):
```typescript
export interface Match {
  id: string;
  home_team: string;
  away_team: string;
  group_name: string;           // 'A' through 'L'
  match_datetime: string;       // ISO string from DB, always UTC
  status: 'scheduled' | 'live' | 'finished';
  home_score: number | null;
  away_score: number | null;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score_prediction: number;
  away_score_prediction: number;
  tokens_wagered: number;
  tokens_awarded: number | null;
  points_earned: number | null;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  tokens: number;
  leaderboard_points: number;
}
```

**Database type extension** — add `matches` and `predictions` tables to `Database.public.Tables` following the existing `profiles` table shape (index.ts lines 4-41).

---

### `src/App.tsx` — EXTEND (router config)

**Analog:** `src/App.tsx` (self)

**Current route structure** (App.tsx lines 47-68):
```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/registro" element={<RegistroPage />} />
<Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />

<Route element={<ProtectedRoute />}>
  <Route element={<Navbar /><main>...<Outlet /></main>}>
    <Route path="/bienvenido" element={<HomePage />} />
    <Route path="/" element={<Navigate to="/bienvenido" replace />} />
  </Route>
</Route>
```

**Phase 2 changes** (D-17, D-18, D-19):
```tsx
// Replace /bienvenido → /calendario in all Navigate targets
// Add two new protected routes inside the layout route:
<Route path="/calendario" element={<CalendarPage />} />
<Route path="/tabla" element={<LeaderboardPage />} />
<Route path="/" element={<Navigate to="/calendario" replace />} />
<Route path="/bienvenido" element={<Navigate to="/calendario" replace />} />
// Remove HomePage import and route
// Update LoginPage redirect target: '/bienvenido' → '/calendario' (LoginPage.tsx line 26, 39)
// Update RegistroPage redirect target: '/bienvenido' → '/calendario' (RegistroPage.tsx line 44)
```

---

### `src/components/Navbar.tsx` — EXTEND (component)

**Analog:** `src/components/Navbar.tsx` (self)

**Current structure** (Navbar.tsx lines 11-28):
```tsx
<nav className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
  {/* Left: brand */}
  <span className="text-2xl font-bold text-white">FUBOL</span>

  {/* Right: user info + logout */}
  <div className="flex items-center gap-4">
    ...
  </div>
</nav>
```

**D-17 nav links to add** — insert between brand span and user-info div:
```tsx
import { NavLink } from 'react-router-dom';

{/* Center: nav links */}
<div className="flex items-center gap-6">
  <NavLink
    to="/calendario"
    className={({ isActive }) =>
      isActive
        ? 'text-white font-semibold'
        : 'text-slate-300 hover:text-white'
    }
  >
    Calendario
  </NavLink>
  <NavLink
    to="/tabla"
    className={({ isActive }) =>
      isActive
        ? 'text-white font-semibold'
        : 'text-slate-300 hover:text-white'
    }
  >
    Tabla
  </NavLink>
</div>
```

---

### `supabase/migrations/0002_matches_predictions.sql` (migration, CRUD)

**Analog:** `supabase/migrations/0001_profiles.sql`

**Migration header pattern** (0001_profiles.sql lines 1-3):
```sql
-- Migration: 0002_matches_predictions
-- Creates matches and predictions tables, leaderboard_view, RLS policies,
-- place_prediction and calculate_prediction_points SQL functions.
-- All token mutations happen in SECURITY DEFINER functions (CLAUDE.md constraint).
```

**Table creation pattern** (0001_profiles.sql lines 5-13):
```sql
-- Always: primary key uuid with gen_random_uuid(), timestamptz for dates,
-- check constraints inline, not null explicit on required columns
create table public.matches (
  id             uuid        primary key default gen_random_uuid(),
  ...
  created_at     timestamptz not null default now()
);
```

**RLS enable + policy pattern** (0001_profiles.sql lines 16-36):
```sql
alter table public.matches enable row level security;

create policy "matches_select_authenticated"
  on public.matches for select
  to authenticated
  using (true);
-- No INSERT/UPDATE policies — mutations via seed SQL and SQL functions only
```

**SECURITY DEFINER function pattern** (RESEARCH.md Pattern 2, lines 289-328):
```sql
create or replace function public.place_prediction(
  p_match_id  uuid,
  p_home_score integer,
  p_away_score integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  ...
begin
  ...
  raise exception 'match_not_scheduled';  -- error name matches frontend errorMap key
  ...
end;
$$;

revoke execute on function public.place_prediction from public, anon;
grant execute on function public.place_prediction to authenticated;
```

**leaderboard_view pattern** (RESEARCH.md DB Schema section):
```sql
create view public.leaderboard_view as
  select id, username, tokens, leaderboard_points
  from public.profiles
  order by leaderboard_points desc, tokens desc;

grant select on public.leaderboard_view to authenticated;
```

---

### `supabase/seed/matches_wc2026.sql` (seed, batch)

**Analog:** `supabase/migrations/0001_profiles.sql` (file structure; pure SQL)

**Seed file structure** — pure INSERT statements, no function definitions:
```sql
-- Seed: matches_wc2026
-- All 72 WC 2026 group-stage matches. Times are UTC (EDT + 4h).
-- Groups A–L. VERIFY times against official FIFA schedule before production run.

insert into public.matches (home_team, away_team, group_name, match_datetime, status)
values
  ('México',         'Sudáfrica',           'A', '2026-06-11 19:00:00+00', 'scheduled'),
  ('Corea del Sur',  'Chequia',             'A', '2026-06-12 02:00:00+00', 'scheduled'),
  ...
;
```

Note: 72 rows total. The full UTC schedule is provided in RESEARCH.md lines 480-553. Implement all rows as a single multi-row INSERT.

---

## Shared Patterns

### Error Banner
**Source:** `src/pages/LoginPage.tsx` lines 77-84
**Apply to:** CalendarPage, LeaderboardPage, PredictionModal (all async operations)
```tsx
{error && (
  <div
    role="alert"
    className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4"
  >
    <p className="text-sm text-red-300">{error}</p>
  </div>
)}
```

### Loading Spinner (inline button)
**Source:** `src/pages/LoginPage.tsx` lines 135-138 / `src/pages/RegistroPage.tsx` lines 203-207
**Apply to:** PredictionModal submit button
```tsx
<span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
```

### Supabase Client Import
**Source:** `src/lib/supabase.ts` line 8
**Apply to:** CalendarPage, LeaderboardPage, PredictionModal
```typescript
import { supabase } from '../lib/supabase';
```

### Zustand Store Import
**Source:** `src/store/authStore.ts` line 15
**Apply to:** CalendarPage (for profile.tokens display), PredictionModal (for updateTokens call)
```typescript
import { useAuthStore } from '../store/authStore';
// For imperative calls outside React render (modal submit handler):
useAuthStore.getState().updateTokens(-20);
```

### Tailwind Color Palette
**Source:** `src/components/Navbar.tsx` lines 11-28, `src/pages/LoginPage.tsx` lines 61-62
**Apply to:** All Phase 2 components
```
bg-slate-900   — page background (set by App.tsx <main>)
bg-slate-800   — card/panel/modal background
border-slate-700 — borders
text-slate-100 — primary text
text-slate-300 — secondary text
text-slate-400 — tertiary/meta text
text-green-400 — token amounts, accent
bg-green-500 / hover:bg-green-600 — primary action button
bg-red-900/50 border-red-700 — error state
bg-green-900/50 border-green-700 — success/prediction badge state
```

### Form Input
**Source:** `src/pages/LoginPage.tsx` lines 92-99
**Apply to:** PredictionModal score inputs
```tsx
className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
```

### RLS Migration Pattern
**Source:** `supabase/migrations/0001_profiles.sql` lines 16-36
**Apply to:** `matches` and `predictions` tables in 0002 migration
```sql
alter table public.<table> enable row level security;

create policy "<table>_select_<role>"
  on public.<table> for select
  to authenticated
  using (<condition>);
```

### date-fns-tz v3 Usage (CRITICAL — do NOT use v2 API)
**Source:** RESEARCH.md lines 131-158 (verified against installed node_modules)
**Apply to:** CalendarPage, MatchCard
```typescript
// CORRECT (v3):
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

// Display time:
const displayTime = formatInTimeZone(new Date(match.match_datetime), userTimezone, 'd MMM · HH:mm zzz');

// Group by local date (NOT UTC date string):
const zonedDate = toZonedTime(new Date(match.match_datetime), userTimezone);
const dateKey = format(zonedDate, 'yyyy-MM-dd');

// WRONG (v2 — will throw ReferenceError at runtime):
// utcToZonedTime(...)   ← does not exist in installed v3.2.0
// zonedTimeToUtc(...)   ← does not exist in installed v3.2.0
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/PredictionModal.tsx` (modal overlay) | component | request-response | No modal/dialog component exists yet — overlay pattern comes from Tailwind conventions, not codebase |
| `supabase/seed/matches_wc2026.sql` | seed | batch | No seed files exist; structure is straightforward multi-row INSERT |

---

## Metadata

**Analog search scope:** `src/` (all files), `supabase/migrations/`
**Files scanned:** 14 (all src files + 1 migration)
**Pattern extraction date:** 2026-06-05
