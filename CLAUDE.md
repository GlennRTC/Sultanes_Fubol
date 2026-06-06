<!-- GSD:project-start source:PROJECT.md -->

## Project

**FUBOL**

FUBOL is a Spanish-language web app built for the FIFA World Cup 2026 that combines a match calendar, a quinielas (score predictions) game, and a Polymarket-style betting module (apuestas) — all powered by a virtual token economy. It runs entirely on free-tier infrastructure (Netlify + Supabase) with no server to manage. It starts as a closed community app where an admin distributes tokens, with plans to open to anyone later.

**Core Value:** A fully playable quinielas + apuestas experience live before the World Cup's first match kicks off on June 11, 2026.

### Constraints

- **Stack**: React 18 + Vite + TypeScript / Netlify / Supabase (Auth + PostgreSQL + Edge Functions / Deno) / TailwindCSS / Zustand / React Router v6 / date-fns + date-fns-tz — stack is fixed, no new dependencies without justification
- **Timeline**: Ship core MVP by June 11, 2026 — 7 days; quinielas and calendar are the non-negotiable minimum
- **Budget**: 100% free tier — Netlify (100GB bandwidth), Supabase (500MB DB, 500k Edge Function invocations), cron-job.org, football-data.org free tier; no credit card spend
- **Security**: RLS enabled on every table, no exceptions; service role key and football API key never exposed to the frontend; tokens never updated directly from the frontend
- **Data**: All datetimes stored in UTC; timezone conversion is frontend-only (date-fns-tz); tokens are integers only (Math.floor on all payouts)
- **Types**: `src/types/index.ts` is the single TypeScript types file — no per-feature type files

<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
