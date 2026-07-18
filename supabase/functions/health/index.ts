import { healthCheckSchema } from '../_shared/schemas.ts';

Deno.serve(async () => {
  const payload = healthCheckSchema.parse({
    status: 'ok',
    service: 'tourose-health',
    checkedAt: new Date().toISOString(),
  });

  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
});
