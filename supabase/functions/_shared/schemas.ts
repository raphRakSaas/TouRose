import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export const healthCheckSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  checkedAt: z.string().datetime(),
});

export const edgeFunctionErrorSchema = z.object({
  error: z.string().min(1),
  code: z.string().min(1),
});

export const reportInputSchema = z.object({
  reportType: z.enum([
    'wrong_date',
    'cancelled_event',
    'closed_place',
    'wrong_info',
    'litigious_image',
    'other',
  ]),
  entityType: z.enum(['event', 'place']),
  entityId: z.string().uuid(),
  message: z.string().min(3).max(1000),
});
