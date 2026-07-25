#!/usr/bin/env node
/**
 * Sync local Supabase cron runtime settings for pg_cron HTTP triggers.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

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

function readImportSecret() {
  const envPath = join(rootDirectory, 'supabase/functions/.env');
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^IMPORT_CRON_SECRET=(.+)$/);
      if (match) {
        return match[1].trim();
      }
    }
  } catch {
    // ignore
  }
  return process.env.IMPORT_CRON_SECRET ?? 'local-import-secret';
}

const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  cwd: rootDirectory,
  encoding: 'utf8',
});

if (status.status !== 0) {
  console.warn('[sync-cron-runtime] Supabase local indisponible — skip.');
  process.exit(0);
}

const env = parseStatusEnv(status.stdout);
const anonKey = env.ANON_KEY ?? env.PUBLISHABLE_KEY;
if (!anonKey) {
  console.warn('[sync-cron-runtime] ANON_KEY manquant — skip.');
  process.exit(0);
}

const functionsBaseUrl = process.env.CRON_FUNCTIONS_BASE_URL ?? 'http://kong:8000';
const importSecret = readImportSecret();

const sql = `
insert into private.cron_runtime (key, value, updated_at) values
  ('functions_base_url', '${functionsBaseUrl.replace(/'/g, "''")}', timezone('utc', now())),
  ('anon_key', '${anonKey.replace(/'/g, "''")}', timezone('utc', now())),
  ('import_cron_secret', '${importSecret.replace(/'/g, "''")}', timezone('utc', now()))
on conflict (key) do update set
  value = excluded.value,
  updated_at = excluded.updated_at;
`;

const apply = spawnSync(
  'pnpm',
  ['exec', 'supabase', 'db', 'query', '--local', sql],
  { cwd: rootDirectory, encoding: 'utf8' },
);

if (apply.status !== 0) {
  console.warn('[sync-cron-runtime] Échec sync cron_runtime:', apply.stderr || apply.stdout);
  process.exit(0);
}

console.log('[sync-cron-runtime] cron_runtime synchronisé pour pg_cron local.');
