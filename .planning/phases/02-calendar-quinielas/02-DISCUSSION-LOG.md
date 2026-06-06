# Phase 2: Calendar + Quinielas - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 2-Calendar + Quinielas
**Areas discussed:** Calendar layout, Prediction UX, Token cost per prediction, Timezone storage

---

## Calendar layout

### Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Date-grouped list | Matches scrollable by date, grouped under headers like "12 de junio". Filter dropdowns at the top. | |
| Tabbed by Group (A–H) | Tabs for each of the 8 groups. User taps Group B to see those 6 matches. | |
| Both views with a toggle | Toggle switch: "Por fecha" vs "Por grupo". | ✓ |

**User's choice:** Both views with a toggle

### Match card content

| Option | Description | Selected |
|--------|-------------|----------|
| Teams + time + status + score | Home vs Away, local timezone time, status badge, actual score if finished. | ✓ |
| Teams + time + status + prediction badge | Same plus shows user's existing prediction on the card. | |
| Minimal: teams + time + status only | No score shown. | |

**User's choice:** Teams + time + status + score (Recommended)

### Filter behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Two dropdowns side-by-side | "Grupo:" and "Equipo:" dropdowns. "Todos" resets each. | ✓ |
| Single combined search/filter | One input, type group letter or team name. | |
| Chips / pill buttons | Row of group/team chips to toggle. | |

**User's choice:** Two dropdowns side-by-side (Recommended)

### Match seed data

| Option | Description | Selected |
|--------|-------------|----------|
| Build from official schedule | Claude builds matches_wc2026.sql with real FIFA WC 2026 schedule. | ✓ |
| User provides the data | User pastes the match list for Claude to format. | |
| Placeholder data for now | Small number of placeholder matches, replace before launch. | |

**User's choice:** Build it from the official schedule (Recommended)

---

## Prediction UX

### Prediction form access

| Option | Description | Selected |
|--------|-------------|----------|
| Modal on card click | Opens a modal with score input form. Calendar stays in context. | ✓ |
| Inline on the card | Score inputs appear directly on the match card when clicked. | |
| Dedicated /partido/:id page | Clicking navigates to a full detail page. | |

**User's choice:** Modal on card click (Recommended)

### Modal contents

| Option | Description | Selected |
|--------|-------------|----------|
| Match info + two score inputs + cost reminder + confirm | Full context with token cost visible. Read-only if already predicted. | ✓ |
| Score inputs only | Minimal modal, no cost reminder. | |
| Full stats modal | Score inputs + match info + standings context. | |

**User's choice:** Match info + two score inputs + cost reminder + confirm (Recommended)

### Post-submission behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Modal closes, card shows prediction badge + Navbar updates | Immediate feedback everywhere. | ✓ |
| Success message in modal, then closes | Modal shows "¡Predicción guardada!" for 1.5s then closes. | |
| Stay in modal, show confirmation state | Modal stays open with success state. | |

**User's choice:** Modal closes, card updates to show prediction badge (Recommended)

### Locked match behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Card clickable, modal opens read-only | Shows existing prediction or locked message. | ✓ |
| Card shows locked icon, not clickable | Lock icon overlay, clicking does nothing. | |
| Card grayed out, no click | Visual dimming + pointer-events: none. | |

**User's choice:** Card is still clickable, modal opens read-only (Recommended)

---

## Token cost per prediction

### Cost per prediction

| Option | Description | Selected |
|--------|-------------|----------|
| 20 tokens per prediction | With 30t/10t payouts, gives meaningful reward for skill. | ✓ |
| 10 tokens per prediction | Lower barrier, correct winner just breaks even. | |
| Let Claude decide | Claude picks the amount. | |

**User's choice:** 20 tokens per prediction (Recommended)

### Initial balance for testing

| Option | Description | Selected |
|--------|-------------|----------|
| 500 tokens | Enough for selective predictions across group stage. | ✓ |
| 1000 tokens | Very generous, lower stakes feel. | |
| 200 tokens | Tight budget, 10 predictions max. | |

**User's choice:** 500 tokens (Recommended)

### Prediction mutability

| Option | Description | Selected |
|--------|-------------|----------|
| Locked on first submission | Final on submit. Modal shows read-only. Simplest DB logic. | |
| Editable until match starts | Can update before kick-off. No extra token cost. | |
| Re-predict costs tokens again | Replaces old prediction, another 20t deducted. | |

**User's choice:** "Option one but with a confirmation." — Locked on first submission, with a confirmation step before final submit ("¿Estás seguro? Esta predicción no se puede cambiar. Se descontarán 20 fichas.").

---

## Timezone storage

### Storage mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage | Browser-only. No DB migration. Doesn't sync across devices. | ✓ |
| profiles.timezone column in Supabase | True cross-device sync. Requires migration + RLS policy. | |
| Auto-detect only, no manual override | Defer override to Phase 4. Simplest to build. | |

**User's choice:** localStorage (Recommended)

### Timezone change UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown in CalendarPage header | "Zona horaria:" dropdown near the filters. | |
| Profile/settings page (/configuracion) | Separate settings page. | |
| Auto-detect only, show "Cambiar" link | Current timezone shown with a small "Cambiar" link. | ✓ |

**User's choice:** Detected automatically only, show a 'Cambiar' link

### Timezone options offered

| Option | Description | Selected |
|--------|-------------|----------|
| Latin America + Spain only (~15 options) | Covering México, Colombia, Perú, Chile, Argentina, Spain, etc. | ✓ |
| All IANA timezones | Full tz database — hundreds of options, overwhelming. | |
| You decide | Claude picks a curated list. | |

**User's choice:** Latin America + Spain only (Recommended)

---

## Claude's Discretion

- DB schema details (indexes, additional constraints, trigger definitions)
- `place_prediction` function internals (parameter names, exception handling, return type)
- Leaderboard query design (ranking by points, tie-breaking logic)
- Match card component structure and CSS beyond Phase 1 patterns
- Exact list of 15 timezone options within the Latin America + Spain constraint
- Supabase RLS policy definitions for `matches` and `predictions` tables

## Deferred Ideas

None — discussion stayed within phase scope.
