---
phase: 01-infrastructure-auth
plan: 01
subsystem: infra
tags: [vite, react, typescript, tailwindcss, zustand, supabase, react-router, date-fns]

# Dependency graph
requires: []
provides:
  - Vite + React 18 + TypeScript + Tailwind CSS project scaffold
  - Typed Supabase client singleton (src/lib/supabase.ts)
  - Single TypeScript types file with Database shape, Profile, AuthUser (src/types/index.ts)
  - Zustand auth store with onAuthStateChange wiring and loading:true initial state
  - profiles table migration with UNIQUE username, tokens>=0 CHECK, and owner-scoped RLS
  - Placeholder HomePage reading live profile from Zustand store
affects: [01-02, 01-03, 02-calendar, 03-betting, 04-admin]

# Tech tracking
tech-stack:
  added:
    - react@^18 + react-dom@^18
    - react-router-dom@^6
    - zustand@^4
    - "@supabase/supabase-js@^2"
    - date-fns@^3 + date-fns-tz@^3
    - vite@^5 + @vitejs/plugin-react@^4
    - typescript@^5
    - tailwindcss@^3 + postcss + autoprefixer
  patterns:
    - Supabase client as module-level singleton from src/lib/supabase.ts (never re-instantiated)
    - Single types file at src/types/index.ts (Database shape + domain types)
    - Zustand store loading:true on mount — resolves via onAuthStateChange
    - onAuthStateChange in App.tsx useEffect with cleanup subscription
    - Profile fetched immediately after session resolves, stored in Zustand
    - All token mutations SQL-only — frontend never writes profiles.tokens

key-files:
  created:
    - package.json
    - vite.config.ts
    - tsconfig.json
    - tsconfig.node.json
    - index.html
    - tailwind.config.js
    - postcss.config.js
    - .env.example
    - src/main.tsx
    - src/index.css
    - src/vite-env.d.ts
    - src/App.tsx
    - src/lib/supabase.ts
    - src/types/index.ts
    - src/store/authStore.ts
    - src/pages/HomePage.tsx
    - supabase/config.toml
    - supabase/migrations/0001_profiles.sql
  modified:
    - .gitignore (added /dist)

key-decisions:
  - "System UI font stack only — no Google Fonts (free bandwidth preservation + UI-SPEC)"
  - "netlify.toml chosen as single SPA redirect source — no public/_redirects dual config"
  - "tsconfig.node.json composite:true required for TypeScript project references"
  - "src/vite-env.d.ts added to expose import.meta.env types (Vite requirement)"
  - "Task 4 (db push) complete — 0001_profiles.sql applied to live Supabase project pajowyfyvdscyqebbhkv"

patterns-established:
  - "Supabase client singleton: import { supabase } from '../lib/supabase' — never call createClient outside this file"
  - "Auth state: import { useAuthStore } from '../store/authStore' — no local user/profile state in components"
  - "Types: all TypeScript types in src/types/index.ts — no per-feature type files"
  - "Profile fetching: happens in App.tsx onAuthStateChange, not in page components"
  - "Loading gate: loading:true until onAuthStateChange fires — prevents login-page flash"

requirements-completed: [INF-03, AUTH-02]

# Metrics
duration: 5min
completed: 2026-06-06
---

# Phase 01 Plan 01: Walking Skeleton Foundation Summary

**Vite + React 18 + TypeScript scaffold wired to Supabase typed client with Zustand auth store, onAuthStateChange profile fetch, and profiles migration with UNIQUE username constraint, tokens>=0 CHECK, and owner-scoped RLS**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-06T00:03:24Z
- **Completed:** 2026-06-06T00:07:43Z
- **Tasks:** 4 of 4 complete (Task 4 confirmed by developer — supabase db push applied 0001_profiles.sql)
- **Files modified:** 19

## Accomplishments

- Full Vite + React 18 + TypeScript + Tailwind CSS project scaffold with zero TypeScript errors and passing npm run build
- Typed Supabase client singleton, single types file (Database + Profile + AuthUser), and Zustand auth store with loading:true initial state
- profiles migration with UNIQUE username, tokens >= 0 CHECK, RLS enabled, and three owner-scoped policies (SELECT/INSERT/UPDATE)
- App.tsx wires onAuthStateChange in a useEffect with cleanup, populates the Zustand store, and renders a full-screen spinner with role="status" and aria-label="Cargando..." while auth resolves
- HomePage reads profile?.username live from the Zustand store and renders "Bienvenido, [username]"

## Task Commits

1. **Task 1: Scaffold Vite + React + TS + Tailwind project** - f26d43b (chore)
2. **Task 2: Supabase client, types, auth store, profiles migration** - 8df287c (feat)
3. **Task 3: App router + onAuthStateChange + HomePage** - a3d9699 (feat)
4. **chore: add /dist to .gitignore** - f2949d3 (chore — auto-fix Rule 2)

Task 4 (db push): Confirmed complete — developer ran `supabase db push` and 0001_profiles.sql was applied to project pajowyfyvdscyqebbhkv.

## Files Created/Modified

- package.json - Fixed stack deps: react, react-dom, react-router-dom, zustand, @supabase/supabase-js, date-fns, date-fns-tz
- vite.config.ts - @vitejs/plugin-react configuration
- tsconfig.json - strict, noUnusedLocals, ES2020, bundler moduleResolution
- tsconfig.node.json - composite:true for project references
- index.html - SPA entry point with div#root loading /src/main.tsx
- tailwind.config.js - system UI font stack, content globs for ./src/**/*.{ts,tsx}
- postcss.config.js - tailwindcss + autoprefixer
- .env.example - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY placeholders
- src/main.tsx - ReactDOM.createRoot rendering App in StrictMode
- src/index.css - @tailwind base/components/utilities + bg-slate-900 body
- src/vite-env.d.ts - Vite env type reference
- src/App.tsx - BrowserRouter, onAuthStateChange useEffect, full-screen spinner, routes
- src/lib/supabase.ts - Typed createClient singleton using VITE_ env vars
- src/types/index.ts - Database shape + Profile + AuthUser (single types file)
- src/store/authStore.ts - Zustand auth store with loading:true and signOut
- src/pages/HomePage.tsx - "Bienvenido, [username]" reading from store
- supabase/config.toml - Supabase local config with project_id placeholder
- supabase/migrations/0001_profiles.sql - profiles table + RLS policies
- .gitignore - Added /dist for Vite build output

## Decisions Made

- tsconfig.node.json required composite:true to satisfy TypeScript project references — added as Rule 3 auto-fix
- src/vite-env.d.ts added to expose import.meta.env types — required by Vite, missing from initial scaffold, added as Rule 3 auto-fix
- System UI font stack used in tailwind.config.js (no Google Fonts per UI-SPEC)
- netlify.toml chosen as SPA redirect source per SKELETON.md — no public/_redirects dual config
- /dist added to .gitignore since npm run build generates it as runtime output

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added tsconfig.node.json composite:true**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** TypeScript project references require composite:true in the referenced config; noEmit:true is incompatible with composite mode
- **Fix:** Added "composite": true and removed "noEmit": true from tsconfig.node.json
- **Files modified:** tsconfig.node.json
- **Verification:** npm run typecheck passes with no errors
- **Committed in:** f26d43b (Task 1 commit)

**2. [Rule 3 - Blocking] Added src/vite-env.d.ts**
- **Found during:** Task 2 (typecheck after adding src/lib/supabase.ts)
- **Issue:** Property 'env' does not exist on type 'ImportMeta' — Vite env type augmentation not loaded
- **Fix:** Created src/vite-env.d.ts with triple-slash reference to vite/client
- **Files modified:** src/vite-env.d.ts (new file)
- **Verification:** npm run typecheck passes; import.meta.env.VITE_SUPABASE_URL resolves correctly
- **Committed in:** 8df287c (Task 2 commit)

**3. [Rule 2 - Missing Critical] Added /dist to .gitignore**
- **Found during:** After Task 3 (npm run build ran as part of verification)
- **Issue:** dist/ directory generated by Vite build was untracked — would pollute git history if accidentally staged
- **Fix:** Added /dist to .gitignore
- **Files modified:** .gitignore
- **Committed in:** f2949d3

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** All auto-fixes required for correct TypeScript compilation and clean git history. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## Task 4 Complete

Developer confirmed `supabase db push` applied 0001_profiles.sql to the live Supabase project (ref: pajowyfyvdscyqebbhkv). The profiles table with UNIQUE username constraint, tokens >= 0 CHECK, RLS enabled, and three owner-scoped policies is live.

## Next Phase Readiness

- Project scaffold builds and typechecks cleanly: ready
- Supabase client singleton and auth store: ready
- RLS migration written: ready (pending db push — Task 4 checkpoint)
- Plan 01-02 (ProtectedRoute, Navbar, auth pages) can begin building on these patterns immediately; live DB push is needed before end-to-end auth can be tested

---
*Phase: 01-infrastructure-auth*
*Completed: 2026-06-06*
