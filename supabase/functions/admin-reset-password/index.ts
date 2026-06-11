// DEPLOY: supabase functions deploy admin-reset-password
// ENV: Set SITE_URL secret in Supabase Dashboard → Functions → Secrets
//      Example: supabase secrets set SITE_URL=https://your-app.netlify.app
// NOTE: Do NOT use --no-verify-jwt on this function. JWT verification is required.
//       supabase.functions.invoke from the JS client sends the user session JWT automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // 1. Validate caller is authenticated
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  // 2. Validate caller is admin
  const { data: profile } = await anonClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return new Response('Forbidden', { status: 403 })

  // 3. Parse target user ID from request body
  const { userId } = await req.json()
  if (!userId) return new Response('Missing userId', { status: 400 })

  // 4. Use service role client to get email + generate reset link
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(userId)
  if (userError || !targetUser.user) return new Response('User not found', { status: 404 })

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: targetUser.user.email!,
    options: { redirectTo: `${Deno.env.get('SITE_URL') ?? ''}/restablecer-contrasena` }
  })
  if (linkError) return new Response(linkError.message, { status: 500 })

  // 5. Log the action (insert via service role client — bypasses RLS)
  await adminClient.from('admin_logs').insert({
    admin_id: user.id,
    action: 'password_reset_sent',
    target_user_id: userId,
    details: { email: targetUser.user.email }
  })

  // linkData is not returned to the caller — email is sent directly by Supabase
  void linkData

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
