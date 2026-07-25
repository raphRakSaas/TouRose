#!/usr/bin/env node
/**
 * Import OpenAgenda réel si la clé est configurée et qu'aucun événement publié n'existe.
 * Utilisé après `supabase db reset` et au démarrage `dev:up`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureFunctionsServe } from './ensure-functions-serve.mjs';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseEnvFile(relativePath) {
  const absolutePath = join(rootDirectory, relativePath);
  if (!existsSync(absolutePath)) {
    return {};
  }

  const values = {};
  for (const line of readFileSync(absolutePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function parseStatusEnv(output) {
  const values = {};
  for (const line of output.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) {
      continue;
    }
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runImportWithRetries() {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    if (attempt > 1) {
      await sleep(4000);
    }
    const importResult = spawnSync('node', ['./scripts/import-openagenda.mjs'], {
      cwd: rootDirectory,
      stdio: 'pipe',
      shell: false,
      encoding: 'utf8',
    });
    if (importResult.status === 0) {
      if (importResult.stdout) {
        console.log(importResult.stdout.trim());
      }
      return true;
    }
    if (attempt < 4) {
      console.warn(`[openagenda] Import tentative ${attempt}/4 échoué — nouvel essai dans 4 s…`);
    } else if (importResult.stdout || importResult.stderr) {
      console.warn(importResult.stdout || importResult.stderr);
    }
  }
  return false;
}

async function countPublishedEvents(apiUrl, anonKey) {
  const response = await fetch(`${apiUrl}/rest/v1/events?status=eq.published&select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  if (!response.ok) {
    return null;
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows.length : null;
}

const functionsEnv = parseEnvFile('supabase/functions/.env');
const openAgendaKey = functionsEnv.OPENAGENDA_PUBLIC_KEY?.trim();

if (!openAgendaKey) {
  console.warn(
    '[openagenda] OPENAGENDA_PUBLIC_KEY absent dans supabase/functions/.env — pas d’import automatique.',
  );
  console.warn(
    '[openagenda] Lieux découverte OK ; lance `pnpm import:openagenda` après avoir configuré la clé.',
  );
  process.exit(0);
}

const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  cwd: rootDirectory,
  encoding: 'utf8',
  shell: false,
});
if (status.status !== 0) {
  console.warn('[openagenda] Supabase local inaccessible — import ignoré.');
  process.exit(0);
}

const supabaseEnv = parseStatusEnv(status.stdout);
const apiUrl = supabaseEnv.API_URL ?? 'http://127.0.0.1:54321';
const anonKey = supabaseEnv.ANON_KEY ?? supabaseEnv.PUBLISHABLE_KEY;

if (!anonKey) {
  console.warn('[openagenda] Clé anon introuvable — import ignoré.');
  process.exit(0);
}

const publishedCount = await countPublishedEvents(apiUrl, anonKey);
if (publishedCount === null) {
  console.warn('[openagenda] Impossible de lire le catalogue — import ignoré.');
  process.exit(0);
}

if (publishedCount > 0) {
  console.log('[openagenda] Catalogue déjà peuplé — import ignoré.');
  process.exit(0);
}

const functionsReady = await ensureFunctionsServe(apiUrl);
if (!functionsReady) {
  process.exit(0);
}

console.log('[openagenda] Aucun événement publié — import OpenAgenda réel…');
const imported = await runImportWithRetries();
if (!imported) {
  console.warn(
    '[openagenda] Import automatique échoué — relance `pnpm import:openagenda` quand Supabase est stable.',
  );
}
process.exit(0);
