#!/usr/bin/env node
/**
 * Production deploy orchestrator.
 *
 * Usage:
 *   node scripts/deploy-production.mjs              # supabase + website + admin builds
 *   node scripts/deploy-production.mjs --supabase-only
 *   node scripts/deploy-production.mjs --clients-only
 *   node scripts/deploy-production.mjs --dry-run
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

function runNodeScript(scriptName, extraArgs = []) {
  const args = ['scripts/' + scriptName, ...extraArgs];
  if (hasFlag('--dry-run')) {
    args.push('--dry-run');
  }
  const result = spawnSync('node', args, {
    cwd: rootDirectory,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runPnpm(scriptArgs) {
  const result = spawnSync('pnpm', scriptArgs, {
    cwd: rootDirectory,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const supabaseOnly = hasFlag('--supabase-only');
const clientsOnly = hasFlag('--clients-only');
const dryRun = hasFlag('--dry-run');

if (dryRun) {
  console.log('[deploy-production] Dry run mode.');
}

if (!clientsOnly) {
  console.log('[deploy-production] Step 1/3 — Supabase cloud');
  runNodeScript('deploy-supabase.mjs');
}

if (!supabaseOnly) {
  console.log('[deploy-production] Step 2/3 — Production client env');
  if (!dryRun) {
    runNodeScript('write-production-env.mjs');
  }

  console.log('[deploy-production] Step 3/3 — Build website + admin');
  if (!dryRun) {
    runPnpm(['--filter', '@tourose/website', 'build']);
    runPnpm(['--filter', '@tourose/admin', 'build']);
  }
}

console.log('[deploy-production] Finished.');
