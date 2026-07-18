#!/usr/bin/env node
/**
 * Trigger OpenAgenda import against local Supabase Edge Function.
 *
 * Usage:
 *   pnpm import:openagenda
 *
 * Fixture mode when OPENAGENDA_PUBLIC_KEY is unset on the function.
 * Requires: `pnpm supabase:start` and edge runtime with import-openagenda deployed/served.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const importSecret = process.env.IMPORT_CRON_SECRET ?? 'local-import-secret';

function fail(message) {
  console.error(`[import:openagenda] ${message}`);
  process.exit(1);
}

function parseStatusEnv(output) {
  const values = {};
  for (const line of output.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2] ?? '';
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  cwd: rootDirectory,
  encoding: 'utf8',
});

if (status.status !== 0) {
  fail('Supabase local inaccessible. Lance `pnpm supabase:start`.');
}

const env = parseStatusEnv(status.stdout);
const apiUrl = env.API_URL ?? 'http://127.0.0.1:54321';
const anonKey = env.ANON_KEY ?? env.PUBLISHABLE_KEY;

if (!anonKey) {
  fail('ANON_KEY manquant dans supabase status.');
}

if (!apiUrl.includes('127.0.0.1') && !apiUrl.includes('localhost')) {
  fail('Refus : ce script est réservé au Supabase local.');
}

const response = await fetch(`${apiUrl}/functions/v1/import-openagenda`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'x-tourose-import-secret': importSecret,
  },
  body: JSON.stringify({ trigger: 'cli' }),
});

const bodyText = await response.text();
let bodyJson;
try {
  bodyJson = JSON.parse(bodyText);
} catch {
  bodyJson = { raw: bodyText };
}

if (!response.ok) {
  console.error(bodyJson);
  fail(`Import HTTP ${response.status}`);
}

console.log(JSON.stringify(bodyJson, null, 2));
