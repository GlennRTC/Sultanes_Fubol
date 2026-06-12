// DEPLOY: supabase functions deploy sync-live-scores --no-verify-jwt
// ENV: Set FOOTBALL_DATA_API_KEY secret in Supabase Dashboard → Functions → Secrets
//      Example: supabase secrets set FOOTBALL_DATA_API_KEY=your_key_here
// NOTE: --no-verify-jwt is required — this function is called by cron-job.org, not by users.
//       Do NOT add Authorization header checks here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiTeam {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

interface ApiScore {
  winner: string | null
  duration: string
  fullTime: { home: number | null; away: number | null }
  halfTime: { home: number | null; away: number | null }
}

interface ApiMatch {
  id: number
  status: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: ApiScore
  utcDate: string
}

interface ApiResponse {
  matches: ApiMatch[]
}

interface DbMatch {
  id: string
  home_team: string
  away_team: string
  match_datetime: string
  status: string
  home_score: number | null
  away_score: number | null
  external_match_id: number | null
}

// ---------------------------------------------------------------------------
// Team name normalization (D-05)
// ---------------------------------------------------------------------------

const ALIAS_MAP: Record<string, string> = {
  // football-data.org name → our DB normalized form
  'korea republic':       'corea del sur',
  'iran':                 'iran',
  'united states':        'estados unidos',
  'mexico':               'mexico',    // DB has 'México'; normalize() strips accent → 'mexico'
  'saudi arabia':         'arabia saudita',
  'south africa':         'sudafrica', // DB 'Sudáfrica' → normalize strips accent → 'sudafrica'
}

function normalize(name: string): string {
  // 1. Lowercase
  let s = name.toLowerCase()
  // 2. Strip diacritics / replace accented chars (cover both pre-composed and NFD)
  s = s
    .replace(/á/g, 'a').replace(/à/g, 'a').replace(/â/g, 'a').replace(/ä/g, 'a')
    .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e').replace(/ë/g, 'e')
    .replace(/í/g, 'i').replace(/ì/g, 'i').replace(/î/g, 'i').replace(/ï/g, 'i')
    .replace(/ó/g, 'o').replace(/ò/g, 'o').replace(/ô/g, 'o').replace(/ö/g, 'o')
    .replace(/ú/g, 'u').replace(/ù/g, 'u').replace(/û/g, 'u').replace(/ü/g, 'u')
    .replace(/ñ/g, 'n')
  // 3. Also handle NFD combining characters (e.g. 'é' → 'e')
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  // 4. Trim whitespace
  s = s.trim()
  // 5. Apply alias map
  if (Object.prototype.hasOwnProperty.call(ALIAS_MAP, s)) {
    return ALIAS_MAP[s]
  }
  return s
}

// ---------------------------------------------------------------------------
// Status mapping (per CONTEXT.md)
// ---------------------------------------------------------------------------

function mapStatus(apiStatus: string): 'live' | 'finished' | null {
  switch (apiStatus) {
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live'
    case 'FINISHED':
      return 'finished'
    case 'SCHEDULED':
    case 'TIMED':
    default:
      return null // no update needed
  }
}

// ---------------------------------------------------------------------------
// Edge Function entry point
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request) => {
  try {
    // STEP 1 — Build today's UTC date string
    const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"

    // STEP 2 — Fetch from football-data.org
    const apiKey = Deno.env.get('FOOTBALL_DATA_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'FOOTBALL_DATA_API_KEY not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiUrl =
      `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${today}&dateTo=${today}`
    const apiRes = await fetch(apiUrl, {
      headers: { 'X-Auth-Token': apiKey },
    })

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      return new Response(
        JSON.stringify({ ok: false, error: `football-data.org error ${apiRes.status}: ${errText}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiData: ApiResponse = await apiRes.json()
    const apiMatches: ApiMatch[] = apiData.matches ?? []

    // STEP 3 — Create service-role Supabase client (bypasses RLS)
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // STEP 4 — Load today's DB matches
    const { data: dbMatches, error: dbError } = await db
      .from('matches')
      .select('id, home_team, away_team, match_datetime, status, home_score, away_score, external_match_id')
      .gte('match_datetime', `${today}T00:00:00Z`)
      .lte('match_datetime', `${today}T23:59:59Z`)
      .order('match_datetime')

    if (dbError) {
      return new Response(
        JSON.stringify({ ok: false, error: `DB read error: ${dbError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const rows: DbMatch[] = dbMatches ?? []

    // STEP 7 — Match-and-update loop
    let updated = 0
    let skipped = 0
    let unmatched = 0
    const unmatchedNames: string[] = []

    for (const apiMatch of apiMatches) {
      // a. Map API status
      const newStatus = mapStatus(apiMatch.status)
      if (newStatus === null) {
        // SCHEDULED / TIMED — no write needed
        skipped++
        continue
      }

      // b. Find corresponding DB match
      let dbMatch: DbMatch | undefined

      // Fast path: external_match_id already stored
      dbMatch = rows.find(
        (r) => r.external_match_id !== null && r.external_match_id === apiMatch.id
      )

      if (!dbMatch) {
        // Slow path: normalize team names + date prefix
        const normHome = normalize(apiMatch.homeTeam.name)
        const normAway = normalize(apiMatch.awayTeam.name)
        dbMatch = rows.find(
          (r) =>
            normalize(r.home_team) === normHome &&
            normalize(r.away_team) === normAway &&
            r.match_datetime.startsWith(today)
        )
      }

      // c. No match found
      if (!dbMatch) {
        console.warn(
          `sync-live-scores: no DB match for API match id=${apiMatch.id} ` +
          `${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name} (${apiMatch.utcDate})`
        )
        unmatched++
        unmatchedNames.push(`${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name}`)
        continue
      }

      // d. Determine new values
      const newHomeScore =
        apiMatch.status === 'FINISHED' ? (apiMatch.score.fullTime.home ?? null) : null
      const newAwayScore =
        apiMatch.status === 'FINISHED' ? (apiMatch.score.fullTime.away ?? null) : null
      const newExternalId = apiMatch.id

      // e. Skip write if nothing changed
      if (
        dbMatch.status === newStatus &&
        dbMatch.home_score === newHomeScore &&
        dbMatch.away_score === newAwayScore &&
        dbMatch.external_match_id === newExternalId
      ) {
        skipped++
        continue
      }

      // f. Write update
      const { error: updateError } = await db
        .from('matches')
        .update({
          status: newStatus,
          home_score: newHomeScore,
          away_score: newAwayScore,
          external_match_id: newExternalId,
        })
        .eq('id', dbMatch.id)

      if (updateError) {
        console.error(
          `sync-live-scores: update failed for match id=${dbMatch.id}: ${updateError.message}`
        )
        // Continue loop — do not abort entire sync on single row failure
        continue
      }

      // g. Increment updated counter
      updated++
    }

    // STEP 8 — Return JSON summary
    return new Response(
      JSON.stringify({
        ok: true,
        date: today,
        apiMatchCount: apiMatches.length,
        updated,
        skipped,
        unmatched,
        unmatchedNames,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`sync-live-scores: unhandled error: ${message}`)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
