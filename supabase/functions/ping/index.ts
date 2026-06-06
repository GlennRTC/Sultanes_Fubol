// Deno / Supabase Edge Function runtime
// Stateless ping function — keeps the free-tier Supabase project alive.
// Deploy with: supabase functions deploy ping --no-verify-jwt
// Called by cron-job.org every 3 days (no auth token required).
Deno.serve(async (_req: Request) => {
  return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
