// Supabase Edge Function: start a Stripe Checkout for a contribution.
//
// POST { "amountPence": 500, "mode": "monthly" | "one_off", "goalId"?: "<uuid>" }
// Optional Authorization header: when signed in, the payment is linked to the
// user (supporter badge, thank-you list). Returns { url } to redirect to.
//
// Secrets (supabase secrets set ...):
//   STRIPE_SECRET_KEY - sk_test_... while developing, sk_live_... when launched
//   SITE_URLS         - comma-separated allowed site addresses, e.g.
//                       "https://your-site.netlify.app,http://localhost:3000"
//                       (first one is the fallback for returning after payment)
//   APP_NAME          - optional, shown on the Stripe page (default "Poke app")
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
//
// Deploy: npx supabase functions deploy create-checkout --no-verify-jwt

import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MIN_PENCE = 100; // £1
const MAX_PENCE = 50000; // £500

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { amountPence?: unknown; mode?: unknown; goalId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  const amountPence = Number(body.amountPence);
  const mode = body.mode === 'monthly' ? 'monthly' : body.mode === 'one_off' ? 'one_off' : null;
  if (!mode || !Number.isInteger(amountPence) || amountPence < MIN_PENCE || amountPence > MAX_PENCE) {
    return json({ error: 'Choose an amount between £1 and £500' }, 400);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Signed-in user, if any (guests are allowed)
  let user: { id: string; email?: string } | null = null;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token && token !== Deno.env.get('SUPABASE_ANON_KEY')) {
    const { data } = await admin.auth.getUser(token);
    if (data.user) user = { id: data.user.id, email: data.user.email };
  }

  // Only accept an active upgrade goal; anything else goes to monthly costs
  let goalId: string | null = null;
  if (typeof body.goalId === 'string' && body.goalId) {
    const { data } = await admin.from('funding_goals').select('id').eq('id', body.goalId).eq('kind', 'upgrade').eq('active', true).maybeSingle();
    goalId = data?.id ?? null;
  }

  // Return to the address the supporter came from, if it's one of ours
  const allowed = (Deno.env.get('SITE_URLS') ?? '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  const origin = req.headers.get('Origin') ?? '';
  const site = allowed.includes(origin) ? origin : allowed[0];
  if (!site) return json({ error: 'SITE_URLS is not configured' }, 500);

  const appName = Deno.env.get('APP_NAME') ?? 'Poke app';
  const metadata = { user_id: user?.id ?? '', goal_id: goalId ?? '' };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: mode === 'monthly' ? 'subscription' : 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amountPence,
            product_data: { name: mode === 'monthly' ? `${appName} monthly support` : `${appName} contribution` },
            ...(mode === 'monthly' ? { recurring: { interval: 'month' as const } } : {}),
          },
        },
      ],
      success_url: `${site}/support?thanks=1`,
      cancel_url: `${site}/support`,
      customer_email: user?.email,
      client_reference_id: user?.id,
      metadata,
      // Copied onto the subscription / payment so the webhook can read it for every renewal
      ...(mode === 'monthly' ? { subscription_data: { metadata } } : { payment_intent_data: { metadata }, submit_type: 'donate' as const }),
    });
    return json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout failed', error);
    return json({ error: "Couldn't start the payment. Please try again." }, 502);
  }
});
