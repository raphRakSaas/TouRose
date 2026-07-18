import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { healthCheckSchema, reportInputSchema } from '../_shared/schemas.ts';

Deno.test('healthCheckSchema accepts a valid payload', () => {
  const parsed = healthCheckSchema.parse({
    status: 'ok',
    service: 'tourose-health',
    checkedAt: new Date().toISOString(),
  });
  assertEquals(parsed.service, 'tourose-health');
});

Deno.test('reportInputSchema rejects an empty message', () => {
  const result = reportInputSchema.safeParse({
    reportType: 'other',
    entityType: 'event',
    entityId: '55555555-5555-5555-5555-555555555501',
    message: 'no',
  });
  assertEquals(result.success, false);
});
