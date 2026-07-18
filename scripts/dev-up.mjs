#!/usr/bin/env node
/**
 * TouRose local bootstrap:
 * 1. Checks Docker
 * 2. Starts Supabase (or reuses it)
 * 3. Writes connected .env files for all apps
 * 4. Starts website + admin (mobile is printed as optional)
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const children = [];

function log(message) {
  console.log(`\n[tourose] ${message}`);
}

function fail(message) {
  console.error(`\n[tourose] ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: 'utf8',
    shell: false,
    ...options,
  });
  return result;
}

function ensureDocker() {
  const docker = run('docker', ['info']);
  if (docker.status !== 0) {
    fail(
      'Docker n’est pas disponible. Ouvre Docker Desktop, attends le voyant vert, puis relance `pnpm dev:up`.',
    );
  }
  log('Docker OK');
}

function ensureDependencies() {
  if (!existsSync(join(rootDirectory, 'node_modules'))) {
    log('Installation des dépendances…');
    const install = run('pnpm', ['install'], { stdio: 'inherit' });
    if (install.status !== 0) fail('pnpm install a échoué.');
  }
}

function parseStatusEnv(output) {
  const values = {};
  for (const line of output.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? '';
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

function startSupabase() {
  const status = run('pnpm', ['exec', 'supabase', 'status', '-o', 'env']);
  if (status.status === 0 && status.stdout.includes('API_URL=')) {
    log('Supabase déjà démarré — réutilisation');
    return parseStatusEnv(status.stdout);
  }

  log('Démarrage de Supabase local (peut prendre 1–2 min)…');
  const start = run('pnpm', ['exec', 'supabase', 'start'], { stdio: 'inherit' });
  if (start.status !== 0) fail('supabase start a échoué.');

  const after = run('pnpm', ['exec', 'supabase', 'status', '-o', 'env']);
  if (after.status !== 0) fail('Impossible de lire supabase status.');
  return parseStatusEnv(after.stdout);
}

function writeEnvFile(relativePath, content) {
  const absolutePath = join(rootDirectory, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
  log(`Écrit ${relativePath}`);
}

function syncAppEnv(supabase) {
  const apiUrl = supabase.API_URL ?? 'http://127.0.0.1:54321';
  const anonKey = supabase.ANON_KEY ?? supabase.PUBLISHABLE_KEY;
  if (!anonKey) fail('Clé anon Supabase introuvable dans le status.');

  writeEnvFile(
    'apps/mobile/.env',
    `# Généré par pnpm dev:up — ne pas committer
EXPO_PUBLIC_SUPABASE_URL=${apiUrl}
EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
EXPO_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
EXPO_PUBLIC_NOTIFICATIONS_ENABLED=false
`,
  );

  writeEnvFile(
    'apps/website/.env.local',
    `# Généré par pnpm dev:up — ne pas committer
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_SUPABASE_URL=${apiUrl}
PUBLIC_SUPABASE_ANON_KEY=${anonKey}
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
`,
  );

  writeEnvFile(
    'apps/admin/.env.local',
    `# Généré par pnpm dev:up — ne pas committer
NG_APP_SUPABASE_URL=${apiUrl}
NG_APP_SUPABASE_ANON_KEY=${anonKey}
`,
  );

  writeEnvFile(
    'apps/admin/src/environments/local.generated.ts',
    `/** Généré par \`pnpm dev:up\` — ne pas committer de secrets cloud. */
export const generatedLocalConfig = {
  supabaseUrl: ${JSON.stringify(apiUrl)},
  supabaseAnonKey: ${JSON.stringify(anonKey)},
} as const;
`,
  );

  return { apiUrl, anonKey, studioUrl: 'http://127.0.0.1:54323' };
}

function spawnDev(name, command, args, colorLabel) {
  log(`Démarrage ${name}…`);
  const child = spawn(command, args, {
    cwd: rootDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  children.push({ name, child });

  const prefix = `[${colorLabel}]`;
  child.stdout.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n').filter(Boolean)) {
      console.log(`${prefix} ${line}`);
    }
  });
  child.stderr.on('data', (chunk) => {
    for (const line of chunk.toString().split('\n').filter(Boolean)) {
      console.error(`${prefix} ${line}`);
    }
  });
  child.on('exit', (code) => {
    console.warn(`[tourose] ${name} s’est arrêté (code ${code ?? '?'})`);
  });
}

function shutdown() {
  log('Arrêt des apps locales…');
  for (const entry of children) {
    entry.child.kill('SIGTERM');
  }
  log('Astuce : `pnpm dev:down` arrête aussi Supabase.');
  process.exit(0);
}

function printSummary(config) {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  TouRose — environnement local prêt                      ║
╠══════════════════════════════════════════════════════════╣
║  Studio Supabase : ${config.studioUrl.padEnd(36)}║
║  API Supabase    : ${config.apiUrl.padEnd(36)}║
║  Website         : http://localhost:4321                 ║
║  Admin           : http://localhost:4200                 ║
╠══════════════════════════════════════════════════════════╣
║  Mobile (terminal séparé) :                              ║
║    pnpm dev:mobile                                       ║
║  Vérifs :                                                ║
║    curl -s http://127.0.0.1:54321/functions/v1/health    ║
║    pnpm exec supabase test db                            ║
║  Arrêt complet : pnpm dev:down                           ║
╚══════════════════════════════════════════════════════════╝
`);
}

ensureDocker();
ensureDependencies();
const supabase = startSupabase();
const config = syncAppEnv(supabase);
printSummary(config);

const withMobile = process.argv.includes('--mobile');

spawnDev(
  'website',
  'pnpm',
  ['--filter', '@tourose/website', 'dev', '--', '--host', '127.0.0.1', '--port', '4321'],
  'website',
);
spawnDev(
  'admin',
  'pnpm',
  ['--filter', '@tourose/admin', 'start', '--', '--host', '127.0.0.1', '--port', '4200'],
  'admin',
);

if (withMobile) {
  spawnDev('mobile', 'pnpm', ['--filter', '@tourose/mobile', 'start'], 'mobile');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
