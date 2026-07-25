import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

import { corsHeaders } from '../_shared/cron-auth.ts';

const SUPPORT_AMOUNTS = {
  100: 'Une gorgée de café',
  500: 'Un croissant rose',
  1000: 'Une brique de Toulouse',
} as const;

const checkoutSchema = z.object({
  installationId: z.string().min(8).max(128),
  amountCents: z.union([z.literal(100), z.literal(500), z.literal(1000)]),
  platform: z.enum(['mobile', 'web']).default('mobile'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed', code: 'method_not_allowed' }, 405);
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    return jsonResponse(
      { error: 'STRIPE_SECRET_KEY is not configured', code: 'misconfigured' },
      500,
    );
  }

  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body', code: 'invalid_json' }, 400);
  }

  const parsed = checkoutSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: parsed.error.issues.map((issue) => issue.message).join('; '),
        code: 'validation_error',
      },
      400,
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: 'Missing Supabase service configuration', code: 'misconfigured' },
      500,
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { installationId, amountCents, platform, successUrl, cancelUrl } = parsed.data;
  const productLabel = SUPPORT_AMOUNTS[amountCents];

  const formBody = new URLSearchParams();
  formBody.set('mode', 'payment');
  formBody.set('success_url', successUrl);
  formBody.set('cancel_url', cancelUrl);
  formBody.set('line_items[0][quantity]', '1');
  formBody.set('line_items[0][price_data][currency]', 'eur');
  formBody.set('line_items[0][price_data][unit_amount]', String(amountCents));
  formBody.set(
    'line_items[0][price_data][product_data][name]',
    `Soutien TouRose — ${productLabel}`,
  );
  formBody.set('metadata[installation_id]', installationId);
  formBody.set('metadata[platform]', platform);
  formBody.set('metadata[amount_cents]', String(amountCents));

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });

  const stripeBody = await stripeResponse.json();
  if (!stripeResponse.ok) {
    return jsonResponse(
      {
        error: stripeBody.error?.message ?? 'Stripe checkout creation failed',
        code: 'stripe_error',
      },
      502,
    );
  }

  const sessionId = stripeBody.id as string;
  const checkoutUrl = stripeBody.url as string;

  const { error: insertError } = await client.from('support_payments').insert({
    provider: 'stripe',
    external_id: sessionId,
    installation_id: installationId,
    amount_cents: amountCents,
    currency: 'eur',
    status: 'pending',
    platform,
  });

  if (insertError && !insertError.message.includes('duplicate')) {
    return jsonResponse({ error: insertError.message, code: 'payment_record_failed' }, 500);
  }

  return jsonResponse({
    ok: true,
    sessionId,
    checkoutUrl,
  });
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
