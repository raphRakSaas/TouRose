#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

spawnSync('node', ['./scripts/openagenda-import-if-needed.mjs'], {
  cwd: rootDirectory,
  stdio: 'inherit',
  shell: false,
});

spawnSync('node', ['./scripts/sync-cron-runtime.mjs'], {
  cwd: rootDirectory,
  stdio: 'inherit',
  shell: false,
});

spawnSync('pnpm', ['import:editorial-photos'], {
  cwd: rootDirectory,
  stdio: 'inherit',
  shell: false,
});

// Ne jamais faire échouer le reset si l'import est indisponible (functions pas prêtes, réseau…).
process.exit(0);
