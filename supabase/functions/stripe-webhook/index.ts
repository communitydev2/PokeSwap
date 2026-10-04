// Supabase Edge Function: receive Stripe payment notifications and record
// confirmed contributions. This is the only thing that writes to
// public.contributions, so the support bars can't be faked from the browser.
//
// Stripe dashboard → Developers → Webhooks → add endpoint:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded,
//         invoice.paid, charge.refunded
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_... from that endpoint)
// Deploy:  npx supabase functions deploy stripe-webhook --no-verify-jwt

import Stripe from 'npm:stripe@17';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { httpClient: Stripe.createFetchHttpClient() });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

type Contribution = {
  stripe_object_id: string;
  stripe_payment_intent: string | null;
  kind: 'one_off' | 'monthly';
  amount_pence: number;
  currency: string;
  user_id: string | null;
  goal_id: string | null;
};

const orNull = (value: unknown) => (typeof value === 'string' && value ? value : null);
const idOf = (value: unknown) => (typeof value === 'string' ? value : (value as { id?: string } | null)?.id ?? null);

// Same Stripe object twice (Stripe retries notifications) is ignored thanks to the unique key
async function record(row: Contribution) {
  const { error } = await admin.from('contributions').upsert(row, { onConflict: 'stripe_object_id', ignoreDuplicates: true });
  if (error) throw error;
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Subscriptions are recorded from invoice.paid (first month included)
      if (session.mode !== 'payment' || session.payment_status !== 'paid' || !session.amount_total) return;
      const paymentIntent = idOf(session.payment_intent);
      await record({
        stripe_object_id: paymentIntent ?? session.id,
        stripe_payment_intent: paymentIntent,
        kind: 'one_off',
        amount_pence: session.amount_total,
        currency: session.currency ?? 'gbp',
        user_id: orNull(session.metadata?.user_id),
        goal_id: orNull(session.metadata?.goal_id),
      });
      return;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice & {
        parent?: { subscription_details?: { metadata?: Record<string, string>; subscription?: string } };
        subscription_details?: { metadata?: Record<string, string> };
        subscription?: string | { id: string };
        payment_intent?: string | { id: string };
      };
      if (!invoice.amount_paid) return;
      // Where the subscription's metadata lives depends on the Stripe API version
      let metadata = invoice.parent?.subscription_details?.metadata ?? invoice.subscription_details?.metadata ?? {};
      const subscriptionId = invoice.parent?.subscription_details?.subscription ?? idOf(invoice.subscription);
      if (!metadata.user_id && !metadata.goal_id && subscriptionId) {
        metadata = (await stripe.subscriptions.retrieve(subscriptionId)).metadata ?? {};
      }
      await record({
        stripe_object_id: invoice.id!,
        stripe_payment_intent: idOf(invoice.payment_intent),
        kind: 'monthly',
        amount_pence: invoice.amount_paid,
        currency: invoice.currency ?? 'gbp',
        user_id: orNull(metadata.user_id),
        goal_id: orNull(metadata.goal_id),
      });
      return;
    }

    case 'charge.refunded': {
      // Fully refunded payments stop counting toward the bars
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent = idOf(charge.payment_intent);
      if (!charge.refunded || !paymentIntent) return;
      const { error } = await admin.from('contributions').update({ refunded: true }).eq('stripe_payment_intent', paymentIntent);
      if (error) throw error;
      return;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '', undefined, cryptoProvider);
  } catch (error) {
    console.warn('Rejected webhook with bad signature', error);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    await handle(event);
  } catch (error) {
    // A 500 makes Stripe retry later, so nothing is lost if the database hiccups
    console.error(`Failed to handle ${event.type}`, error);
    return new Response('Error', { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
