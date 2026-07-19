import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { edgeFunctionErrorSchema } from "../_shared/schemas.ts";
import fixtureEvents from "./fixtures/toulouse-demo-events.json" with {
  type: "json",
};
import {
  hashPayload,
  type NormalizedMedia,
  normalizeOpenAgendaEvent,
  OPENAGENDA_SOURCE_ID,
  type OpenAgendaEvent,
  type OpenAgendaLocation,
} from "./normalize.ts";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tourose-import-secret",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonError("Method not allowed", "method_not_allowed", 405);
  }

  const expectedSecret = Deno.env.get("IMPORT_CRON_SECRET") ??
    "local-import-secret";
  const providedSecret = request.headers.get("x-tourose-import-secret");
  if (!providedSecret || providedSecret !== expectedSecret) {
    return jsonError("Unauthorized import secret", "unauthorized", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError(
      "Missing Supabase service configuration",
      "misconfigured",
      500,
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const correlationId = crypto.randomUUID();
  const agendaUid = Deno.env.get("OPENAGENDA_AGENDA_UID") ?? "fixture";
  const openAgendaKey = Deno.env.get("OPENAGENDA_PUBLIC_KEY");

  const { data: runRow, error: runError } = await client
    .from("import_runs")
    .insert({
      source_id: OPENAGENDA_SOURCE_ID,
      status: "running",
      correlation_id: correlationId,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    return jsonError(
      runError?.message ?? "Cannot create import run",
      "upsert",
      500,
    );
  }

  const importRunId = runRow.id as string;
  let fetchedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    const events = await loadEvents(openAgendaKey, agendaUid);
    if (openAgendaKey) {
      const locations = await loadLocations(openAgendaKey, agendaUid);
      const locationsByUid = new Map(
        locations
          .filter((location) => location.uid != null)
          .map((location) => [String(location.uid), location]),
      );
      for (const eventRow of events) {
        if (eventRow.location?.uid == null) continue;
        const detailedLocation = locationsByUid.get(
          String(eventRow.location.uid),
        );
        if (detailedLocation) {
          eventRow.location = { ...detailedLocation, ...eventRow.location };
        }
      }
    }
    fetchedCount = events.length;

    const categorySlugToId = await loadCategoryMap(client);

    for (const eventRow of events) {
      try {
        const normalized = await normalizeOpenAgendaEvent(eventRow, {
          agendaUid,
        });
        const { data: upsertResult, error: upsertError } = await client.rpc(
          "import_upsert_event",
          {
            payload: normalized,
          },
        );

        if (upsertError) {
          errorCount += 1;
          await logImportError(
            client,
            importRunId,
            normalized.external_id,
            "upsert",
            upsertError.message,
            {
              title: normalized.title,
            },
          );
          continue;
        }

        const action = (upsertResult as { action?: string } | null)?.action ??
          "updated";
        const result = upsertResult as {
          entity_id: string;
          place_id?: string | null;
        };
        const eventId = result.entity_id;
        if (action === "created") createdCount += 1;
        else if (action === "skipped") skippedCount += 1;
        else updatedCount += 1;

        await syncEventCategories(
          client,
          eventId,
          normalized.category_slugs,
          categorySlugToId,
        );

        // Détails riches (conditions, accessibilité, âge, inscription…) hors RPC d'upsert.
        if (action !== "skipped") {
          await client
            .from("events")
            .update({ details: normalized.details })
            .eq("id", eventId);

          if (normalized.place && result.place_id) {
            await client
              .from("places")
              .update({
                description: normalized.place.description ?? null,
                postal_code: normalized.place.postal_code ?? null,
                website_url: normalized.place.website_url ?? null,
                phone: normalized.place.phone ?? null,
                details: normalized.place.details,
              })
              .eq("id", result.place_id);
          }
        }

        // Soft duplicate hint (non-destructive)
        const { data: similarRows } = await client
          .from("events")
          .select("id, title")
          .neq("id", eventId)
          .ilike("title", normalized.title)
          .limit(1);

        if (similarRows && similarRows.length > 0) {
          await logImportError(
            client,
            importRunId,
            normalized.external_id,
            "possible_duplicate",
            `Possible duplicate of event ${similarRows[0].id}`,
            { candidate_id: similarRows[0].id, title: normalized.title },
          );
        }

        if (normalized.image) {
          await syncOpenAgendaMedia(client, "event", eventId, normalized.image);
        }
        if (normalized.place?.image && result.place_id) {
          await syncOpenAgendaMedia(
            client,
            "place",
            result.place_id,
            normalized.place.image,
          );
        }
      } catch (eventError) {
        errorCount += 1;
        const externalId = eventRow.uid != null ? String(eventRow.uid) : null;
        await logImportError(
          client,
          importRunId,
          externalId,
          "normalize",
          eventError instanceof Error ? eventError.message : "normalize failed",
          {},
        );
      }
    }

    const finalStatus = errorCount === 0
      ? "succeeded"
      : createdCount + updatedCount + skippedCount > 0
      ? "partial"
      : "failed";

    await client
      .from("import_runs")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        fetched_count: fetchedCount,
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        message: openAgendaKey
          ? `OpenAgenda agenda ${agendaUid}`
          : "Fixture mode (no OPENAGENDA_PUBLIC_KEY)",
      })
      .eq("id", importRunId);

    return new Response(
      JSON.stringify({
        ok: true,
        importRunId,
        correlationId,
        status: finalStatus,
        fetchedCount,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        mode: openAgendaKey ? "api" : "fixture",
        fixtureHashProbe: await hashPayload({ fetchedCount }),
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (fatalError) {
    await client
      .from("import_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        fetched_count: fetchedCount,
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        error_count: errorCount + 1,
        message: fatalError instanceof Error
          ? fatalError.message
          : "import failed",
      })
      .eq("id", importRunId);

    return jsonError(
      fatalError instanceof Error ? fatalError.message : "import failed",
      "other",
      500,
    );
  }
});

async function loadEvents(
  openAgendaKey: string | undefined,
  agendaUid: string,
): Promise<OpenAgendaEvent[]> {
  if (!openAgendaKey) {
    return fixtureEvents as OpenAgendaEvent[];
  }

  const events: OpenAgendaEvent[] = [];
  let after: string[] | null = null;

  for (let pageIndex = 0; pageIndex < 50; pageIndex += 1) {
    const url = new URL(
      `https://api.openagenda.com/v2/agendas/${agendaUid}/events`,
    );
    url.searchParams.set("size", "100");
    // detailed=1 → longDescription, conditions, accessibilité, âge, inscription, timings complets.
    url.searchParams.set("detailed", "1");
    url.searchParams.set("longDescriptionFormat", "markdown");
    url.searchParams.append("relative[]", "upcoming");
    url.searchParams.append("relative[]", "current");
    if (after) {
      for (const cursorPart of after) {
        url.searchParams.append("after[]", cursorPart);
      }
    }

    const response = await fetch(url, {
      headers: { key: openAgendaKey },
    });
    if (!response.ok) {
      throw new Error(`OpenAgenda HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      events?: OpenAgendaEvent[];
      after?: string[] | null;
    };
    events.push(...(body.events ?? []));
    if (!body.after || (body.events?.length ?? 0) === 0) {
      break;
    }
    after = body.after;
  }

  return events;
}

async function loadLocations(
  openAgendaKey: string,
  agendaUid: string,
): Promise<OpenAgendaLocation[]> {
  const locations: OpenAgendaLocation[] = [];
  let after: string | string[] | null = null;

  for (let pageIndex = 0; pageIndex < 50; pageIndex += 1) {
    const url = new URL(
      `https://api.openagenda.com/v2/agendas/${agendaUid}/locations`,
    );
    url.searchParams.set("size", "100");
    url.searchParams.set("detailed", "1");
    if (after) {
      const cursorParts = Array.isArray(after) ? after : [after];
      for (const cursorPart of cursorParts) {
        url.searchParams.append("after[]", cursorPart);
      }
    }

    const response = await fetch(url, { headers: { key: openAgendaKey } });
    if (!response.ok) {
      throw new Error(`OpenAgenda locations HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      locations?: OpenAgendaLocation[];
      after?: string | string[] | null;
    };
    locations.push(...(body.locations ?? []));
    if (!body.after || (body.locations?.length ?? 0) === 0) break;
    after = body.after;
  }

  return locations;
}

async function loadCategoryMap(
  client: ReturnType<typeof createClient>,
): Promise<Map<string, string>> {
  const { data: categoryRows } = await client.from("categories").select(
    "id, slug",
  );
  const slugToId = new Map<string, string>();
  for (const categoryRow of categoryRows ?? []) {
    const { id, slug } = categoryRow as { id: string; slug: string };
    if (id && slug) {
      slugToId.set(slug, id);
    }
  }
  return slugToId;
}

async function syncEventCategories(
  client: ReturnType<typeof createClient>,
  eventId: string,
  categorySlugs: string[],
  categorySlugToId: Map<string, string>,
): Promise<void> {
  if (categorySlugs.length === 0) {
    return;
  }

  const categoryIds = categorySlugs
    .map((slug) => categorySlugToId.get(slug))
    .filter((id): id is string => Boolean(id));

  if (categoryIds.length === 0) {
    return;
  }

  await client.from("event_categories").delete().eq("event_id", eventId);
  await client.from("event_categories").upsert(
    categoryIds.map((categoryId) => ({
      event_id: eventId,
      category_id: categoryId,
    })),
    { onConflict: "event_id,category_id" },
  );
}

async function syncOpenAgendaMedia(
  client: ReturnType<typeof createClient>,
  entityType: "event" | "place",
  entityId: string,
  media: NormalizedMedia,
): Promise<void> {
  const { data: existingMedia } = await client
    .from("media_assets")
    .select("id")
    .eq("remote_url", media.remote_url)
    .maybeSingle();

  let mediaId = existingMedia?.id as string | undefined;
  const mediaPayload = {
    remote_url: media.remote_url,
    width_px: media.width_px ?? null,
    height_px: media.height_px ?? null,
    alt_text: media.alt_text,
    author: media.author ?? null,
    source_url: media.source_url,
    attribution_text: media.attribution_text,
    cache_permission: false,
    rights_status: "needs_review",
  };

  if (mediaId) {
    const { error } = await client.from("media_assets").update(mediaPayload).eq(
      "id",
      mediaId,
    );
    if (error) throw error;
  } else {
    const { data: insertedMedia, error } = await client
      .from("media_assets")
      .insert(mediaPayload)
      .select("id")
      .single();
    if (error || !insertedMedia) {
      throw error ?? new Error("Cannot store OpenAgenda media");
    }
    mediaId = insertedMedia.id as string;
  }

  await client
    .from("entity_media")
    .update({ is_cover: false })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_cover", true);

  const { error: linkError } = await client.from("entity_media").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      media_id: mediaId,
      position: 0,
      is_cover: true,
    },
    { onConflict: "entity_type,entity_id,media_id" },
  );
  if (linkError) throw linkError;
}

async function logImportError(
  client: ReturnType<typeof createClient>,
  importRunId: string,
  externalId: string | null,
  errorCode: string,
  message: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.from("import_errors").insert({
    import_run_id: importRunId,
    external_id: externalId,
    error_code: errorCode,
    message,
    payload,
  });
}

function jsonError(message: string, code: string, status: number): Response {
  const errorBody = edgeFunctionErrorSchema.parse({ error: message, code });
  return new Response(JSON.stringify(errorBody), {
    status,
    headers: corsHeaders,
  });
}
