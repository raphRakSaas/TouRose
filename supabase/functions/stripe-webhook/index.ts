import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { corsHeaders } from "../_shared/cron-auth.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeSecretKey || !webhookSecret) {
    return jsonResponse({ error: "Stripe webhook is not configured", code: "misconfigured" }, 500);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing stripe-signature header", code: "invalid_signature" }, 400);
  }

  const rawBody = await request.text();
  const verified = await verifyStripeSignature(rawBody, signature, webhookSecret);
  if (!verified) {
    return jsonResponse({ error: "Invalid stripe signature", code: "invalid_signature" }, 400);
  }

  const event = JSON.parse(rawBody) as {
    type: string;
    data: { object: Record<string, unknown> };
  };

  if (event.type !== "checkout.session.completed") {
    return jsonResponse({ ok: true, ignored: true, type: event.type });
  }

  const session = event.data.object;
  const sessionId = String(session.id ?? "");
  const paymentStatus = String(session.payment_status ?? "");
  const amountTotal = Number(session.amount_total ?? 0);
  const currency = String(session.currency ?? "eur");
  const metadata = (session.metadata ?? {}) as Record<string, string>;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase service configuration", code: "misconfigured" }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const status = paymentStatus === "paid" ? "completed" : "failed";

  const { error } = await client.from("support_payments").upsert(
    {
      provider: "stripe",
      external_id: sessionId,
      installation_id: metadata.installation_id ?? null,
      amount_cents: amountTotal,
      currency,
      status,
      platform: metadata.platform === "web" ? "web" : "mobile",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,external_id" },
  );

  if (error) {
    return jsonResponse({ error: error.message, code: "payment_update_failed" }, 500);
  }

  return jsonResponse({ ok: true, sessionId, status });
});

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signaturePart = parts.find((part) => part.startsWith("v1="));
  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = timestampPart.slice(2);
  const expectedSignature = signaturePart.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(computedSignature, expectedSignature);
}

function timingSafeEqual(first: string, second: string): boolean {
  if (first.length !== second.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return mismatch === 0;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
