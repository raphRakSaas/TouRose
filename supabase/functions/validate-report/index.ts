import { edgeFunctionErrorSchema, reportInputSchema } from '../_shared/schemas.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    const errorBody = edgeFunctionErrorSchema.parse({
      error: 'Method not allowed',
      code: 'method_not_allowed',
    });
    return new Response(JSON.stringify(errorBody), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    const errorBody = edgeFunctionErrorSchema.parse({
      error: 'Invalid JSON body',
      code: 'invalid_json',
    });
    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = reportInputSchema.safeParse(jsonBody);
  if (!parsed.success) {
    const errorBody = edgeFunctionErrorSchema.parse({
      error: parsed.error.issues.map((issue) => issue.message).join('; '),
      code: 'validation_error',
    });
    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      accepted: true,
      reportType: parsed.data.reportType,
      // Echo only non-sensitive validated fields — no secrets involved.
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
