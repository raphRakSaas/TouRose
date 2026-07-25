export function assertCronSecret(request: Request): Response | null {
  const expectedSecret = Deno.env.get('IMPORT_CRON_SECRET') ?? 'local-import-secret';
  const providedSecret = request.headers.get('x-tourose-import-secret');
  if (!providedSecret || providedSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized import secret', code: 'unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return null;
}

export const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tourose-import-secret',
};
