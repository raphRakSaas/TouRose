#!/usr/bin/env node
/**
 * Attend que les Edge Functions répondent ; démarre `supabase functions serve` si besoin.
 * Kong renvoie 503 "name resolution failed" tant que le runtime n'est pas lancé.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function isFunctionsHealthy(apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/functions/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function waitForFunctionsHealthy(apiUrl, timeoutMs = 90_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isFunctionsHealthy(apiUrl)) {
      return true;
    }
    await sleep(2000);
  }
  return false;
}

export function startFunctionsServeDetached() {
  const envFilePath = join(rootDirectory, 'supabase/functions/.env');
  const serveArgs = ['exec', 'supabase', 'functions', 'serve'];
  if (existsSync(envFilePath)) {
    serveArgs.push('--env-file', 'supabase/functions/.env');
  }

  const child = spawn('pnpm', serveArgs, {
    cwd: rootDirectory,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

export async function ensureFunctionsServe(apiUrl) {
  if (await waitForFunctionsHealthy(apiUrl, 15_000)) {
    return true;
  }

  console.log('[functions] Démarrage de supabase functions serve…');
  startFunctionsServeDetached();

  const ready = await waitForFunctionsHealthy(apiUrl, 90_000);
  if (!ready) {
    console.warn(
      '[functions] Edge Functions indisponibles — lance `pnpm dev:up` ou `pnpm exec supabase functions serve --env-file supabase/functions/.env`.',
    );
  }
  return ready;
}
