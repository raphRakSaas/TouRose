#!/usr/bin/env node
/**
 * Stop local TouRose stack: spawned note + Supabase containers.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

function log(message) {
  console.log(`[tourose] ${message}`);
}

log('Arrêt de Supabase local…');
const stop = spawnSync('pnpm', ['exec', 'supabase', 'stop'], {
  cwd: rootDirectory,
  encoding: 'utf8',
  stdio: 'inherit',
});

if (stop.status !== 0) {
  console.warn('[tourose] supabase stop a renvoyé une erreur (peut-être déjà arrêté).');
}

log('Si website/admin tournent encore, arrête-les avec Ctrl+C dans le terminal `pnpm dev:up`.');
log('Terminé.');
