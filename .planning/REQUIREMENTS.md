# Requirements: FUBOL

**Defined:** 2026-06-04
**Core Value:** A fully playable quinielas + apuestas experience live before the World Cup's first match kicks off on June 11, 2026.

## v1 Requirements

Requirements for initial release. Each maps to a roadmap phase.

### Authentication

- [ ] **AUTH-01**: User can register with username + email + password
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: User can reset password via email link

### Calendar (Calendario)

- [ ] **CAL-01**: All 72 group stage matches are visible (WC2026: 12 groups × 6 matches)
- [ ] **CAL-02**: Match times are shown in the user's local timezone (auto-detected, manual override persists across sessions)
- [ ] **CAL-03**: Matches are filterable by group and by team
- [ ] **CAL-04**: Match status (scheduled / live / finished) is visible on each match card

### Quinielas

- [ ] **QUI-01**: User can predict the exact score for any scheduled match
- [ ] **QUI-02**: Prediction is blocked once a match has started or finished
- [ ] **QUI-03**: Tokens are deducted immediately on prediction submission
- [ ] **QUI-04**: Points and tokens are auto-credited when admin enters the result (exact score = 3 pts + 30 tokens; correct winner/draw = 1 pt + 10 tokens; wrong = 0)
- [ ] **QUI-05**: Global leaderboard ranks all users by total prediction points

### Apuestas (Bet Pools)

- [ ] **APU-01**: Admin can create a betting pool (binary / multiple_exclusive / numeric_range) with 2–4 options and a deadline
- [ ] **APU-02**: All authenticated users can see open pools and live parimutuel odds
- [ ] **APU-03**: User can bet tokens on one option per pool before the deadline
- [ ] **APU-04**: Bets are rejected at the DB level if the user has insufficient tokens
- [ ] **APU-05**: Duplicate bets on the same pool are rejected (UNIQUE constraint enforced in DB)
- [ ] **APU-06**: Admin resolves a pool and tokens are distributed proportionally to winners with no house cut
- [ ] **APU-07**: User can view their bet history showing win/loss status and tokens won

### Tokens

- [ ] **TOK-01**: Admin can add tokens to any user account
- [ ] **TOK-02**: Every token movement (credit or debit) creates a corresponding token_transactions record
- [ ] **TOK-03**: Token balance can never drop below 0 (enforced by DB CHECK constraint)

### Admin Panel

- [ ] **ADM-01**: Admin can list, search, block, and unblock user accounts
- [ ] **ADM-02**: Admin can trigger a password reset for any user
- [ ] **ADM-03**: Admin can add or remove tokens from any user
- [ ] **ADM-04**: Admin can enter match results manually, which triggers automatic prediction scoring
- [ ] **ADM-05**: Admin can create a bet pool with options and a deadline
- [ ] **ADM-06**: Admin can resolve a bet pool by selecting the winning option
- [ ] **ADM-07**: Admin can view a token circulation report and top predictors leaderboard
- [ ] **ADM-08**: Every admin action is logged to admin_logs with target and details

### Infrastructure

- [ ] **INF-01**: App is deployed and live on Netlify with a public URL
- [ ] **INF-02**: Unauthenticated users cannot access protected routes
- [ ] **INF-03**: No cross-user data exposure (Row Level Security verified on all tables)
- [ ] **INF-04**: App is mobile responsive at 375px viewport (iOS Safari + Android Chrome)
- [ ] **INF-05**: Supabase anti-pause ping Edge Function running on cron-job.org every 3 days
- [ ] **INF-06**: Supabase daily backups enabled

## v2 Requirements

Deferred to post-launch. Tracked but not in current roadmap.

### Growth

- Knockout stage match creation — seeded data covers group stage; knockouts created as tournament progresses
- Football data auto-sync (sync-matches Edge Function) — built but not critical-path for June 11 launch
- Open registration — initially admin-invited; opening to public is post-launch

### UX Enhancements

- Push notifications for pool resolution and prediction scoring
- Half-time pool deadline automation — admin sets manually in MVP

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real money / payments | Tokens are virtual gamification only; no monetary value attached |
| OAuth / social login (Google, GitHub, magic link) | Email/password is sufficient for the private group use case |
| Custom pool types beyond binary / multiple_exclusive / numeric_range | Three types cover all World Cup betting scenarios |
| i18n / multi-language support | Spanish is the only target language; English in code only |
| Mobile native app (iOS/Android) | Web-first; mobile app is post-v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| INF-01 | Phase 1 | Pending |
| INF-02 | Phase 1 | Pending |
| INF-03 | Phase 1 | Pending |
| INF-05 | Phase 1 | Pending |
| INF-06 | Phase 1 | Pending |
| CAL-01 | Phase 2 | Pending |
| CAL-02 | Phase 2 | Pending |
| CAL-03 | Phase 2 | Pending |
| CAL-04 | Phase 2 | Pending |
| QUI-01 | Phase 2 | Pending |
| QUI-02 | Phase 2 | Pending |
| QUI-03 | Phase 2 | Pending |
| QUI-04 | Phase 2 | Pending |
| QUI-05 | Phase 2 | Pending |
| APU-01 | Phase 3 | Pending |
| APU-02 | Phase 3 | Pending |
| APU-03 | Phase 3 | Pending |
| APU-04 | Phase 3 | Pending |
| APU-05 | Phase 3 | Pending |
| APU-06 | Phase 3 | Pending |
| APU-07 | Phase 3 | Pending |
| TOK-01 | Phase 3 | Pending |
| TOK-02 | Phase 3 | Pending |
| TOK-03 | Phase 3 | Pending |
| ADM-01 | Phase 4 | Pending |
| ADM-02 | Phase 4 | Pending |
| ADM-03 | Phase 4 | Pending |
| ADM-04 | Phase 4 | Pending |
| ADM-05 | Phase 4 | Pending |
| ADM-06 | Phase 4 | Pending |
| ADM-07 | Phase 4 | Pending |
| ADM-08 | Phase 4 | Pending |
| INF-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37/37
- Unmapped: 0

---
*Requirements defined: 2026-06-04*
*Last updated: 2026-06-04 after roadmap creation*
