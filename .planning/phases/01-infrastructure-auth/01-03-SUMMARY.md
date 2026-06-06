---
phase: 01-infrastructure-auth
plan: 03
subsystem: infra
tags: [netlify, supabase-functions, deno, cron, deployment]

# Dependency graph
requires: [01-01]
provides:
  - netlify.toml with SPA catch-all redirect
  - Stateless ping Edge Function (Deno)
  - Live public URL at https://sultanesdelfubol.netlify.app
  - cron-job.org job calling ping every 3 days
affects: [02-calendar, 03-betting, 04-admin]

# Tech tracking
tech-stack:
  added:
    - Netlify (free tier, connected to GitHub repo)
    - Supabase Edge Functions (Deno runtime)
    - cron-job.org (free tier, 3-day interval)
  patterns:
    - netlify.toml as single redirect source — no public/_redirects
    - ping function is stateless, no Supabase client, no secrets
    - VITE_ env vars set in Netlify dashboard (baked at build time by Vite)

key-files:
  created:
    - netlify.toml
    - supabase/functions/ping/index.ts

key-decisions:
  - "netlify.toml is the single SPA redirect source — no public/_redirects dual config"
  - "ping deployed with --no-verify-jwt so cron-job.org can call it without auth token"
  - "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in Netlify env vars (not committed)"
  - "Supabase daily backups NOT available on free tier — INF-06 accepted risk"

requirements-completed: [INF-01, INF-05]
requirements-partial: [INF-06]

# Metrics
duration: ~30min (includes human checkpoint steps)
completed: 2026-06-06
---

# Phase 01 Plan 03: Deployment Summary

**App live at https://sultanesdelfubol.netlify.app — netlify.toml SPA redirect active, ping Edge Function deployed at https://pajowyfyvdscyqebbhkv.supabase.co/functions/v1/ping, cron-job.org job running every 3 days**

## Performance

- **Duration:** ~30 min (including human checkpoints)
- **Completed:** 2026-06-06
- **Tasks:** 3/3 complete (Tasks 2 and 3 were human-action checkpoints)
- **Files modified:** 2

## Accomplishments

- `netlify.toml` with `npm run build`, `publish = "dist"`, and `/* → /index.html status 200` SPA catch-all redirect
- Stateless Deno ping Edge Function deployed with `--no-verify-jwt`; returns `{"ok":true,"ts":"..."}` with no auth header required
- App live at https://sultanesdelfubol.netlify.app; /login renders; deep-link SPA routing works in production
- cron-job.org job hitting ping URL every 3 days; manual "Run now" confirmed 200 response
- VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set in Netlify environment variables; production build bundles correct values

## Task Commits

1. **Task 1: netlify.toml + ping Edge Function** — e9fc195 (feat)
2. **Task 2: ping deployed + cron-job.org configured** — human-action checkpoint, confirmed
3. **Task 3: Netlify deploy live + backups** — human-action checkpoint, confirmed

## Deviations from Plan

### Accepted Risk: INF-06 Supabase Backups

- **Issue:** INF-06 requires daily backups enabled; Supabase free tier does not offer database backups
- **Decision:** Accept risk — free-tier constraint; data loss risk is low during pre-launch development
- **Mitigation:** Periodic manual exports can substitute until project upgrades to a paid tier

## Issues Encountered

- `netlify.toml` was committed after the first Netlify build, requiring a second deploy trigger to activate the SPA redirect
- VITE_ env vars must be set in Netlify dashboard BEFORE the build runs — Vite bakes them into the bundle at build time

---

*Phase: 01-infrastructure-auth*
*Completed: 2026-06-06*
