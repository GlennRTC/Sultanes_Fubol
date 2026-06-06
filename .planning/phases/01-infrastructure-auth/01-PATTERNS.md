# Phase 1: Infrastructure + Auth - Pattern Map

**Mapped:** 2026-06-05
**Files analyzed:** 14 new files
**Analogs found:** 0 / 14 (greenfield — all patterns established fresh)

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/lib/supabase.ts` | config/utility | request-response | none | no analog |
| `src/types/index.ts` | types | — | none | no analog |
| `src/store/authStore.ts` | store | event-driven | none | no analog |
| `src/components/ProtectedRoute.tsx` | middleware/component | request-response | none | no analog |
| `src/components/Navbar.tsx` | component | request-response | none | no analog |
| `src/pages/LoginPage.tsx` | component | request-response | none | no analog |
| `src/pages/RegistroPage.tsx` | component | request-response | none | no analog |
| `src/pages/ResetPasswordPage.tsx` | component | request-response | none | no analog |
| `src/pages/HomePage.tsx` | component | request-response | none | no analog |
| `src/App.tsx` | config/router | request-response | none | no analog |
| `src/main.tsx` | config | — | none | no analog |
| `netlify.toml` | config | — | none | no analog |
| `public/_redirects` | config | — | none | no analog |
| `supabase/functions/ping/index.ts` | service | request-response | none | no analog |

---

## Pattern Assignments

### `src/lib/supabase.ts` (config/utility, request-response)

**Analog:** none — greenfield

**Intended pattern:**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/index';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Rules:**
- Single export, never re-instantiated
- Typed with the generated `Database` type from `src/types/index.ts`
- Env vars prefixed `VITE_` — never the service role key
- Import this singleton everywhere; never call `createClient` outside this file

---

### `src/types/index.ts` (types, —)

**Analog:** none — greenfield

**Intended pattern:**
```typescript
// Supabase Database shape (manually maintained until supabase gen types is run)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;          // uuid, FK to auth.users
          username: string;
          tokens: number;
          is_admin: boolean;
          is_blocked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
    };
  };
};

// App-level types
export interface Profile {
  id: string;
  username: string;
  tokens: number;
  is_admin: boolean;
  is_blocked: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
}
```

**Rules:**
- Single file for all TypeScript types — no per-feature type files
- Supabase `Database` type at the top, app domain types below
- All datetimes are `string` (ISO 8601 UTC from DB); conversion is frontend-only

---

### `src/store/authStore.ts` (store, event-driven)

**Analog:** none — greenfield

**Intended pattern:**
```typescript
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile, AuthUser } from '../types/index';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,           // true on mount — resolves via onAuthStateChange
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
```

**Initialization pattern (called once in `App.tsx` or `main.tsx`):**
```typescript
// Subscribe to auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    useAuthStore.getState().setUser({ id: session.user.id, email: session.user.email! });
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    useAuthStore.getState().setProfile(data);
  } else {
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setProfile(null);
  }
  useAuthStore.getState().setLoading(false);
});
```

**Rules:**
- `loading: true` on initial mount prevents flash of login page (D-10)
- Profile fetched immediately after auth session resolves
- `signOut` is the only auth mutation inside the store; all other auth mutations live in page components

---

### `src/components/ProtectedRoute.tsx` (middleware/component, request-response)

**Analog:** none — greenfield

**Intended pattern:**
```typescript
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import FullScreenSpinner from './FullScreenSpinner';

export function ProtectedRoute() {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
```

**Rules:**
- Full-screen spinner while `loading` is true (D-10)
- Stores `location` in `state.from` for post-login redirect (D-09)
- Uses `<Outlet />` — wraps child routes in `App.tsx`, not individual pages
- Authenticated users hitting `/login` or `/registro` are redirected to `/calendario` (D-11) — handled in those page components, not here

---

### `src/components/Navbar.tsx` (component, request-response)

**Analog:** none — greenfield

**Intended pattern:**
```typescript
import { useAuthStore } from '../store/authStore';

export function Navbar() {
  const { profile, signOut } = useAuthStore();

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
      <span className="font-bold text-xl">FUBOL</span>
      <div className="flex items-center gap-4">
        <span className="text-sm">{profile?.username}</span>
        <span className="text-sm">Fichas: {profile?.tokens ?? 0}</span>
        <button
          onClick={signOut}
          className="text-sm underline hover:no-underline"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
```

**Rules:**
- Reads from Zustand store — no local state, no props
- Token balance label is "Fichas" (D-12, D-13)
- Logout button label is "Cerrar sesión" (D-12)
- Phase 2 will add navigation links — keep the flex layout extensible

---

### `src/pages/LoginPage.tsx` (component, request-response)

**Analog:** none — greenfield

**Intended pattern:**
```typescript
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Spanish error map over Supabase English strings
const errorMap: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo antes de ingresar.',
};

function mapError(msg: string): string {
  return errorMap[msg] ?? 'Error al ingresar. Intenta de nuevo.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/calendario';

  // D-11: redirect authenticated users away from /login
  if (user) { navigate('/calendario', { replace: true }); return null; }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(mapError(error.message));
      setLoading(false);
    } else {
      navigate(from, { replace: true });  // D-09
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Ingresar</h1>
        {/* email, password inputs, submit button */}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <p className="text-sm">
          ¿No tienes cuenta? <Link to="/registro" className="underline">Regístrate</Link>
        </p>
      </form>
    </div>
  );
}
```

**Rules:**
- `mapError()` translates Supabase English errors to Spanish
- Redirect to `state.from` on success (D-09), default to `/calendario`
- Link to `/registro` with the exact Spanish text from D-03

---

### `src/pages/RegistroPage.tsx` (component, request-response)

**Analog:** `src/pages/LoginPage.tsx` (same role, same data flow — established in Phase 1)

**Intended pattern:**
```typescript
// 3 fields: username, email, password (D-05)
// On submit:
//   1. supabase.auth.signUp({ email, password })
//   2. If success, INSERT into profiles: { id: user.id, username, tokens: 0, is_admin: false, is_blocked: false }
//   3. If duplicate username (DB unique violation), show "Ese nombre de usuario ya existe."
//   4. Navigate to /login with success message
```

**Username duplicate error detection:**
```typescript
// Supabase returns PostgreSQL error code 23505 for unique violations
if (profileError?.code === '23505') {
  setError('Ese nombre de usuario ya existe.');
}
```

**Rules:**
- Direct INSERT into `profiles` after `signUp` (D-07) — no trigger, no Edge Function
- Username field validates: no spaces, 3–20 chars, alphanumeric + underscores (client-side)
- Link to `/login` with text "¿Ya tienes cuenta? Ingresa" (D-03)
- D-11: redirect authenticated users away to `/calendario`

---

### `src/pages/ResetPasswordPage.tsx` (component, request-response)

**Analog:** `src/pages/LoginPage.tsx` (same role)

**Intended pattern:**
```typescript
// Email input only — calls supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })
// On success: show confirmation message (not navigate away)
// D-04: after the user clicks the email link, Supabase handles the token;
//        the redirect URL lands back on /login with a query param or hash
//        — detect PASSWORD_RECOVERY event in onAuthStateChange and show success message
```

**Rules:**
- One field, one action — minimal form
- Success state replaces the form with a Spanish confirmation message
- No auto-login after reset (D-04)

---

### `src/pages/HomePage.tsx` (component, request-response)

**Analog:** none — placeholder page

**Intended pattern:**
```typescript
// Minimal placeholder — replaced by real calendar in Phase 2
export function HomePage() {
  const { profile } = useAuthStore();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Bienvenido, {profile?.username}</h1>
    </div>
  );
}
```

**Rules:**
- Greeting in Spanish with username (D-14)
- No data fetching — profile already in Zustand store from auth initialization
- Wrapped by `ProtectedRoute` in the router

---

### `src/App.tsx` (config/router, request-response)

**Intended pattern:**
```typescript
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { HomePage } from './pages/HomePage';

export function App() {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // ... populate store (see authStore pattern above)
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<><Navbar /><main className="..."><Outlet /></main></>}>
            <Route path="/calendario" element={<HomePage />} />
            <Route path="/" element={<Navigate to="/calendario" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Rules:**
- `onAuthStateChange` subscription set up in `useEffect` with cleanup
- Navbar only rendered inside protected layout route — not on `/login` or `/registro`
- Default route `/` redirects to `/calendario`

---

### `src/main.tsx` (config, —)

**Intended pattern:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Rules:**
- No providers needed at this level — Zustand stores are module-level singletons
- `index.css` imports TailwindCSS directives (`@tailwind base/components/utilities`)

---

### `netlify.toml` (config, —)

**Intended pattern:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Rules:**
- SPA catch-all redirect handles React Router client-side routing
- `public/_redirects` is an alternative; either works — pick one, not both

---

### `public/_redirects` (config, —)

**Intended pattern:**
```
/*  /index.html  200
```

**Rules:**
- Simple fallback if not using `netlify.toml` redirects section
- Do not include both — use `netlify.toml` as the single source; omit this file

---

### `supabase/functions/ping/index.ts` (service, request-response)

**Analog:** none — greenfield Deno Edge Function

**Intended pattern:**
```typescript
// Deno / Supabase Edge Function runtime
Deno.serve(async (_req: Request) => {
  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Rules:**
- No Supabase client needed — ping is stateless
- cron-job.org hits this URL every 4 days to prevent Supabase free-tier project pause
- Deploy with: `supabase functions deploy ping --no-verify-jwt`
- `--no-verify-jwt` required so the cron job can call it without an auth token

---

## Shared Patterns

### Supabase Client Import
**Source:** `src/lib/supabase.ts` (established in this phase)
**Apply to:** All files that touch the database or auth
```typescript
import { supabase } from '../lib/supabase';
```

### Auth State Access
**Source:** `src/store/authStore.ts` (established in this phase)
**Apply to:** All components that need user/profile data
```typescript
const { user, profile, loading } = useAuthStore();
```

### Spanish Error Mapping
**Source:** `src/pages/LoginPage.tsx` `mapError()` function (established in this phase)
**Apply to:** `RegistroPage.tsx`, `ResetPasswordPage.tsx`, and any future form that calls Supabase auth
```typescript
const errorMap: Record<string, string> = { /* Supabase English: Spanish */ };
function mapError(msg: string): string {
  return errorMap[msg] ?? 'Error inesperado. Intenta de nuevo.';
}
```

### TailwindCSS Form Layout
**Apply to:** All auth page forms
```tsx
<div className="min-h-screen flex items-center justify-center bg-gray-50">
  <form className="bg-white p-8 rounded shadow w-full max-w-sm space-y-4">
    ...
  </form>
</div>
```

### D-11: Authenticated User Guard on Public Pages
**Apply to:** `LoginPage.tsx`, `RegistroPage.tsx`
```typescript
const { user } = useAuthStore();
if (user) { navigate('/calendario', { replace: true }); return null; }
```

---

## No Analog Found

All files in this phase are greenfield — no existing codebase to draw from. All patterns listed above become the canonical baseline for Phases 2–4.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All 14 files | various | various | Completely greenfield project — Phase 1 establishes all patterns |

---

## Metadata

**Analog search scope:** entire repository (greenfield — only config files exist)
**Files scanned:** 0 source files (none exist yet)
**Pattern extraction date:** 2026-06-05
