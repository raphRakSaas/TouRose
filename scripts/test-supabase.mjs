#!/usr/bin/env node
/**
 * Runs Supabase health / pgTAP checks when Docker + Supabase CLI are available.
 * Exits 0 with a skip message when Docker is unavailable (local/CI without services).
 */
import { spawnSync } from 'node:child_process';

function run(command, args) {
  return spawnSync(command, args, { encoding: 'utf8', shell: false });
}

const docker = run('docker', ['info']);
if (docker.status !== 0) {
  console.warn('[test:supabase] Docker is not available — skipping Supabase integration checks.');
  process.exit(0);
}

const status = run('pnpm', ['exec', 'supabase', 'status', '-o', 'env']);
if (status.status !== 0) {
  console.warn(
    '[test:supabase] Supabase is not running. Start it with `pnpm supabase:start`, then re-run.',
  );
  process.exit(0);
}

const health = run('pnpm', ['exec', 'supabase', 'test', 'db']);
if (health.status !== 0) {
  console.error(health.stdout);
  console.error(health.stderr);
  process.exit(health.status ?? 1);
}

console.log(health.stdout);
process.exit(0);
