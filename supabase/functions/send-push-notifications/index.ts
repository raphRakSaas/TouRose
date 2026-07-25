import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { assertCronSecret, corsHeaders } from "../_shared/cron-auth.ts";

type PushSubscriptionRow = {
  installation_id: string;
  expo_push_token: string;
  notification_prefs: {
    weekendIdeas?: boolean;
    favoriteReminders?: boolean;
    weatherSuggestions?: boolean;
  };
  opted_out_at: string | null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  }

  const unauthorized = assertCronSecret(request);
  if (unauthorized) {
    return unauthorized;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase service configuration", code: "misconfigured" }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const isFriday = dayOfWeek === 5;

  const { data: subscriptions, error } = await client
    .from("push_subscriptions")
    .select("installation_id, expo_push_token, notification_prefs, opted_out_at")
    .is("opted_out_at", null);

  if (error) {
    return jsonResponse({ error: error.message, code: "query_failed" }, 500);
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[];
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const subscription of rows) {
    const prefs = subscription.notification_prefs ?? {};
    const weekendEnabled = prefs.weekendIdeas !== false;

    if (!isFriday || !weekendEnabled) {
      skippedCount += 1;
      continue;
    }

    const weekKey = `${now.getUTCFullYear()}-W${isoWeekNumber(now)}`;
    const idempotencyKey = `weekend:${subscription.installation_id}:${weekKey}`;
    const title = "Idées pour le week-end";
    const body = "Trois sorties à Toulouse t’attendent — ouvre TouRose pour les découvrir.";

    const deliveryResult = await sendPushOnce(client, {
      subscription,
      campaignType: "weekend_ideas",
      idempotencyKey,
      title,
      body,
    });

    if (deliveryResult === "sent") {
      sentCount += 1;
    } else if (deliveryResult === "skipped") {
      skippedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  return jsonResponse({
    ok: true,
    isFriday,
    sentCount,
    skippedCount,
    failedCount,
    checkedAt: now.toISOString(),
  });
});

async function sendPushOnce(
  client: ReturnType<typeof createClient>,
  options: {
    subscription: PushSubscriptionRow;
    campaignType: string;
    idempotencyKey: string;
    title: string;
    body: string;
  },
): Promise<"sent" | "skipped" | "failed"> {
  const { data: existing } = await client
    .from("notification_deliveries")
    .select("id")
    .eq("idempotency_key", options.idempotencyKey)
    .maybeSingle();

  if (existing) {
    return "skipped";
  }

  const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: options.subscription.expo_push_token,
      title: options.title,
      body: options.body,
      sound: "default",
      data: { campaignType: options.campaignType },
    }),
  });

  const pushBody = await pushResponse.json().catch(() => ({}));
  const pushData = pushBody as { data?: Array<{ status?: string; message?: string }> };
  const ticketStatus = pushData.data?.[0]?.status;
  const isSent = pushResponse.ok && ticketStatus !== "error";

  const { error: insertError } = await client.from("notification_deliveries").insert({
    installation_id: options.subscription.installation_id,
    campaign_type: options.campaignType,
    idempotency_key: options.idempotencyKey,
    title: options.title,
    body: options.body,
    status: isSent ? "sent" : "failed",
    error_message: isSent ? null : pushData.data?.[0]?.message ?? `HTTP ${pushResponse.status}`,
  });

  if (insertError) {
    console.error("notification delivery insert failed", insertError);
  }

  return isSent ? "sent" : "failed";
}

function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
