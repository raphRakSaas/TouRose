#!/usr/bin/env node
/**
 * Vérifie que le catalogue cloud répond (RPC + comptage événements).
 *
 * Usage :
 *   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ANON_KEY=... pnpm check:cloud-catalog
 */
function fail(message) {
  console.error(`[check:cloud-catalog] ${message}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !anonKey) {
  fail('Définis SUPABASE_URL et SUPABASE_ANON_KEY (ou EXPO_PUBLIC_SUPABASE_ANON_KEY).');
}

if (anonKey.includes('replace-with')) {
  fail('Clé anon placeholder détectée — utilise la clé du dashboard Supabase.');
}

const response = await fetch(`${supabaseUrl}/rest/v1/rpc/list_upcoming_public_events`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  },
  body: JSON.stringify({ limit_count: 5 }),
});

const responseText = await response.text();
let payload;
try {
  payload = JSON.parse(responseText);
} catch {
  payload = responseText;
}

if (!response.ok) {
  console.error(payload);
  fail(`RPC HTTP ${response.status} — vérifie URL + clé anon (Settings → API).`);
}

const events = Array.isArray(payload) ? payload : [];
console.log(
  `[check:cloud-catalog] OK — ${events.length} événement(s) à venir (échantillon max 5).`,
);

if (events.length === 0) {
  console.log(
    '[check:cloud-catalog] Catalogue vide : lance un import OpenAgenda cloud (`pnpm import:openagenda:cloud` ou Actions → OpenAgenda cron).',
  );
  process.exit(2);
}

for (const eventRow of events) {
  console.log(`  - ${eventRow.title ?? eventRow.slug} (${eventRow.next_starts_at ?? 'sans date'})`);
}
