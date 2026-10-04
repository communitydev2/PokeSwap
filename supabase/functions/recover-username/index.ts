// Supabase Edge Function: email a user their username.
//
// POST { "email": "someone@example.com" }
// Always answers { ok: true } (unless the request is malformed), whether or not
// the email has an account, so the form can't be used to discover accounts.
//
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY  - API key from https://resend.com
//   FROM_EMAIL      - verified sender, e.g. "Poke app <no-reply@yourdomain.com>"
//   SITE_URL        - live site address, linked in the email
//   APP_NAME        - optional, defaults to "Poke app"
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Needs supabase/username-recovery.sql to have been run.
// Deploy: npx supabase functions deploy recover-username --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_PER_EMAIL_PER_HOUR = 3;
const MAX_PER_IP_PER_HOUR = 10;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

async function sendUsernameEmail(to: string, username: string) {
  const appName = Deno.env.get('APP_NAME') ?? 'Poke app';
  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL'),
      to,
      subject: `Your ${appName} username`,
      text:
        `Hi,\n\nYour ${appName} username is: ${username}\n\n` +
        (siteUrl ? `Sign in at ${siteUrl}\n\n` : '') +
        `If you didn't ask for this, you can ignore this email.`,
      html:
        `<p>Hi,</p><p>Your ${escapeHtml(appName)} username is: <strong>${escapeHtml(username)}</strong></p>` +
        (siteUrl ? `<p><a href="${escapeHtml(siteUrl)}">Sign in to ${escapeHtml(appName)}</a></p>` : '') +
        `<p>If you didn't ask for this, you can ignore this email.</p>`,
    }),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let email = '';
  try {
    email = String((await req.json()).email ?? '').trim().toLowerCase();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return json({ error: 'Please enter a valid email address' }, 400);
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const [emailHash, ipHash] = await Promise.all([sha256(email), sha256(ip)]);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [byEmail, byIp] = await Promise.all([
    supabase.from('username_recovery_requests').select('id', { count: 'exact', head: true })
      .eq('email_hash', emailHash).gte('requested_at', hourAgo),
    supabase.from('username_recovery_requests').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('requested_at', hourAgo),
  ]);
  if (byEmail.error || byIp.error) {
    console.error('Rate limit check failed', byEmail.error ?? byIp.error);
    return json({ ok: true });
  }

  // Over the limit: answer the same as usual, just don't send anything
  if ((byEmail.count ?? 0) >= MAX_PER_EMAIL_PER_HOUR || (byIp.count ?? 0) >= MAX_PER_IP_PER_HOUR) {
    return json({ ok: true });
  }

  await supabase.from('username_recovery_requests').insert({ email_hash: emailHash, ip_hash: ipHash });

  const { data: username, error } = await supabase.rpc('get_username_by_email', { p_email: email });
  if (error) console.error('Username lookup failed', error);
  else if (username) await sendUsernameEmail(email, username);

  return json({ ok: true });
});
