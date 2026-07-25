#!/usr/bin/env node
/**
 * Cron tick: OpenAgenda import + health check (+ optional push notifications on Friday).
 *
 * Usage:
 *   pnpm cron:tick
 *   pnpm cron:tick -- --skip-import
 *   pnpm cron:tick -- --with-push
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureFunctionsServe } from './ensure-functions-serve.mjs';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const importSecret = process.env.IMPORT_CRON_SECRET ?? 'local-import-secret';
const args = process.argv.slice(2);
const skipImport = args.includes('--skip-import');
const withPush = args.includes('--with-push');

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

function fail(message) {
  console.error(`[cron:tick] ${message}`);
  process.exit(1);
}

async function callFunction(apiUrl, anonKey, functionName, body = {}) {
  const response = await fetch(`${apiUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'x-tourose-import-secret': importSecret,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    console.error(`[cron:tick] ${functionName} HTTP ${response.status}`, json);
    return false;
  }

  console.log(`[cron:tick] ${functionName}`, JSON.stringify(json));
  return true;
}

const explicitUrl = process.env.SUPABASE_URL;
const explicitAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let apiUrl = explicitUrl?.replace(/\/$/, '');
let anonKey = explicitAnonKey;
let isLocal = false;

if (!apiUrl || !anonKey) {
  const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
    cwd: rootDirectory,
    encoding: 'utf8',
  });
  if (status.status !== 0) {
    fail(
      'Supabase inaccessible. Définis SUPABASE_URL + SUPABASE_ANON_KEY ou lance supabase local.',
    );
  }
  const env = parseStatusEnv(status.stdout);
  apiUrl = (env.API_URL ?? 'http://127.0.0.1:54321').replace(/\/$/, '');
  anonKey = env.ANON_KEY ?? env.PUBLISHABLE_KEY;
  isLocal = apiUrl.includes('127.0.0.1') || apiUrl.includes('localhost');
} else {
  isLocal = apiUrl.includes('127.0.0.1') || apiUrl.includes('localhost');
}

if (!anonKey) {
  fail('ANON_KEY manquant.');
}

if (isLocal) {
  const functionsReady = await ensureFunctionsServe(apiUrl);
  if (!functionsReady) {
    fail('Edge Functions indisponibles en local.');
  }
}

let ok = true;

if (!skipImport) {
  ok = (await callFunction(apiUrl, anonKey, 'import-openagenda', { trigger: 'cron-tick' })) && ok;
}

ok = (await callFunction(apiUrl, anonKey, 'import-health', { trigger: 'cron-tick' })) && ok;

if (withPush || new Date().getUTCDay() === 5) {
  ok =
    (await callFunction(apiUrl, anonKey, 'send-push-notifications', { trigger: 'cron-tick' })) &&
    ok;
}

process.exit(ok ? 0 : 1);
