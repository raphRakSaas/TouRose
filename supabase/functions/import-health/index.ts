import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { assertCronSecret, corsHeaders } from "../_shared/cron-auth.ts";

const OPENAGENDA_SOURCE_ID = "22222222-2222-2222-2222-222222222201";
const DEFAULT_STALE_HOURS = 6;

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

  const staleAfterHours = Number(Deno.env.get("IMPORT_STALE_HOURS") ?? DEFAULT_STALE_HOURS);

  const { data: lastRun, error: lastRunError } = await client
    .from("import_runs")
    .select("id, status, started_at, finished_at, error_count, message")
    .eq("source_id", OPENAGENDA_SOURCE_ID)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRunError) {
    return jsonResponse({ error: lastRunError.message, code: "query_failed" }, 500);
  }

  const alerts: Array<{ alert_type: string; severity: string; message: string }> = [];

  if (!lastRun) {
    alerts.push({
      alert_type: "import_stale",
      severity: "error",
      message: "Aucun import OpenAgenda enregistré.",
    });
  } else if (lastRun.status === "failed") {
    alerts.push({
      alert_type: "import_failed",
      severity: "error",
      message: lastRun.message ?? "Le dernier import OpenAgenda a échoué.",
    });
  } else if (lastRun.status === "partial") {
    alerts.push({
      alert_type: "import_partial",
      severity: "warning",
      message: lastRun.message ?? "Le dernier import OpenAgenda est partiel.",
    });
  } else if (lastRun.status === "succeeded") {
    const finishedAt = lastRun.finished_at ?? lastRun.started_at;
    const hoursSinceSuccess =
      (Date.now() - new Date(finishedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceSuccess > staleAfterHours) {
      alerts.push({
        alert_type: "import_stale",
        severity: "warning",
        message:
          `Dernier import réussi il y a ${hoursSinceSuccess.toFixed(1)} h (seuil ${staleAfterHours} h).`,
      });
    }
  }

  for (const alert of alerts) {
    await client.from("import_alerts").insert({
      source_id: OPENAGENDA_SOURCE_ID,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      metadata: { last_run_id: lastRun?.id ?? null },
    });
  }

  const webhookUrl = Deno.env.get("IMPORT_ALERT_WEBHOOK_URL");
  if (webhookUrl && alerts.length > 0) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "tourose-import-health",
          alerts,
          lastRun,
          checkedAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("import-health webhook failed", error);
    }
  }

  return jsonResponse({
    ok: true,
    alertCount: alerts.length,
    alerts,
    lastRun,
    checkedAt: new Date().toISOString(),
  });
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
