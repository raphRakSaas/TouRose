import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

import { corsHeaders } from "../_shared/cron-auth.ts";

const registerSchema = z
  .object({
    installationId: z.string().min(8).max(128),
    expoPushToken: z.string().regex(/^ExponentPushToken\[[^\]]+\]$/).optional(),
    platform: z.enum(["ios", "android", "web", "unknown"]),
    notificationPrefs: z
      .object({
        weekendIdeas: z.boolean().optional(),
        favoriteReminders: z.boolean().optional(),
        weatherSuggestions: z.boolean().optional(),
      })
      .optional(),
    optedOut: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (!value.optedOut && !value.expoPushToken) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expoPushToken is required when not opted out",
        path: ["expoPushToken"],
      });
    }
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  }

  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body", code: "invalid_json" }, 400);
  }

  const parsed = registerSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return jsonResponse(
      {
        error: parsed.error.issues.map((issue) => issue.message).join("; "),
        code: "validation_error",
      },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase service configuration", code: "misconfigured" }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { installationId, expoPushToken, platform, notificationPrefs, optedOut } = parsed.data;

  const { error } = await client.from("push_subscriptions").upsert(
    {
      installation_id: installationId,
      expo_push_token: expoPushToken ?? `opted-out:${installationId}`,
      platform,
      notification_prefs: notificationPrefs ?? {},
      opted_out_at: optedOut ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "installation_id" },
  );

  if (error) {
    return jsonResponse({ error: error.message, code: "upsert_failed" }, 500);
  }

  return jsonResponse({ ok: true, installationId });
});

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
