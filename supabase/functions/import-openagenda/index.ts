import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { edgeFunctionErrorSchema } from '../_shared/schemas.ts';
import fixtureEvents from './fixtures/toulouse-demo-events.json' with { type: 'json' };
import {
  hashPayload,
  normalizeOpenAgendaEvent,
  OPENAGENDA_SOURCE_ID,
  type OpenAgendaEvent,
} from './normalize.ts';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tourose-import-secret',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 'method_not_allowed', 405);
  }

  const expectedSecret = Deno.env.get('IMPORT_CRON_SECRET') ?? 'local-import-secret';
  const providedSecret = request.headers.get('x-tourose-import-secret');
  if (!providedSecret || providedSecret !== expectedSecret) {
    return jsonError('Unauthorized import secret', 'unauthorized', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError('Missing Supabase service configuration', 'misconfigured', 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const correlationId = crypto.randomUUID();
  const agendaUid = Deno.env.get('OPENAGENDA_AGENDA_UID') ?? 'fixture';
  const openAgendaKey = Deno.env.get('OPENAGENDA_PUBLIC_KEY');

  const { data: runRow, error: runError } = await client
    .from('import_runs')
    .insert({
      source_id: OPENAGENDA_SOURCE_ID,
      status: 'running',
      correlation_id: correlationId,
    })
    .select('id')
    .single();

  if (runError || !runRow) {
    return jsonError(runError?.message ?? 'Cannot create import run', 'upsert', 500);
  }

  const importRunId = runRow.id as string;
  let fetchedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    const events = await loadEvents(openAgendaKey, agendaUid);
    fetchedCount = events.length;

    for (const eventRow of events) {
      try {
        const normalized = await normalizeOpenAgendaEvent(eventRow, { agendaUid });
        const { data: upsertResult, error: upsertError } = await client.rpc('import_upsert_event', {
          payload: normalized,
        });

        if (upsertError) {
          errorCount += 1;
          await logImportError(
            client,
            importRunId,
            normalized.external_id,
            'upsert',
            upsertError.message,
            {
              title: normalized.title,
            },
          );
          continue;
        }

        const action = (upsertResult as { action?: string } | null)?.action ?? 'updated';
        const eventId = (upsertResult as { entity_id: string }).entity_id;
        if (action === 'created') createdCount += 1;
        else if (action === 'skipped') skippedCount += 1;
        else updatedCount += 1;

        // Soft duplicate hint (non-destructive)
        const { data: similarRows } = await client
          .from('events')
          .select('id, title')
          .neq('id', eventId)
          .ilike('title', normalized.title)
          .limit(1);

        if (similarRows && similarRows.length > 0) {
          await logImportError(
            client,
            importRunId,
            normalized.external_id,
            'possible_duplicate',
            `Possible duplicate of event ${similarRows[0].id}`,
            { candidate_id: similarRows[0].id, title: normalized.title },
          );
        }

        if (normalized.image) {
          const { data: existingMedia } = await client
            .from('media_assets')
            .select('id')
            .eq('remote_url', normalized.image.remote_url)
            .maybeSingle();

          let mediaId = existingMedia?.id as string | undefined;
          const mediaPayload = {
            remote_url: normalized.image.remote_url,
            width_px: normalized.image.width_px ?? null,
            height_px: normalized.image.height_px ?? null,
            alt_text: normalized.image.alt_text,
            author: normalized.image.author ?? null,
            source_url: normalized.image.source_url,
            attribution_text: normalized.image.attribution_text,
            cache_permission: false,
            rights_status: 'needs_review',
          };

          if (mediaId) {
            await client.from('media_assets').update(mediaPayload).eq('id', mediaId);
          } else {
            const { data: insertedMedia, error: mediaError } = await client
              .from('media_assets')
              .insert(mediaPayload)
              .select('id')
              .single();
            if (mediaError || !insertedMedia) {
              await logImportError(
                client,
                importRunId,
                normalized.external_id,
                'media_rights',
                mediaError?.message ?? 'Cannot store OpenAgenda image',
                { remote_url: normalized.image.remote_url },
              );
              continue;
            }
            mediaId = insertedMedia.id as string;
          }

          await client
            .from('entity_media')
            .update({ is_cover: false })
            .eq('entity_type', 'event')
            .eq('entity_id', eventId)
            .eq('is_cover', true);

          await client.from('entity_media').upsert(
            {
              entity_type: 'event',
              entity_id: eventId,
              media_id: mediaId,
              position: 0,
              is_cover: true,
            },
            { onConflict: 'entity_type,entity_id,media_id' },
          );
        }
      } catch (eventError) {
        errorCount += 1;
        const externalId = eventRow.uid != null ? String(eventRow.uid) : null;
        await logImportError(
          client,
          importRunId,
          externalId,
          'normalize',
          eventError instanceof Error ? eventError.message : 'normalize failed',
          {},
        );
      }
    }

    const finalStatus =
      errorCount === 0
        ? 'succeeded'
        : createdCount + updatedCount + skippedCount > 0
          ? 'partial'
          : 'failed';

    await client
      .from('import_runs')
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
          : 'Fixture mode (no OPENAGENDA_PUBLIC_KEY)',
      })
      .eq('id', importRunId);

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
        mode: openAgendaKey ? 'api' : 'fixture',
        fixtureHashProbe: await hashPayload({ fetchedCount }),
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (fatalError) {
    await client
      .from('import_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        fetched_count: fetchedCount,
        created_count: createdCount,
        updated_count: updatedCount,
        skipped_count: skippedCount,
        error_count: errorCount + 1,
        message: fatalError instanceof Error ? fatalError.message : 'import failed',
      })
      .eq('id', importRunId);

    return jsonError(
      fatalError instanceof Error ? fatalError.message : 'import failed',
      'other',
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
    const url = new URL(`https://api.openagenda.com/v2/agendas/${agendaUid}/events`);
    url.searchParams.set('size', '100');
    url.searchParams.append('relative[]', 'upcoming');
    url.searchParams.append('relative[]', 'current');
    if (after) {
      for (const cursorPart of after) {
        url.searchParams.append('after[]', cursorPart);
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

async function logImportError(
  client: ReturnType<typeof createClient>,
  importRunId: string,
  externalId: string | null,
  errorCode: string,
  message: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.from('import_errors').insert({
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
