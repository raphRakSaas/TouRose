#!/usr/bin/env node
/**
 * TouRose local bootstrap:
 * 1. Checks Docker
 * 2. Starts Supabase (or reuses it)
 * 3. Writes connected .env files for all apps
 * 4. Starts website + admin + mobile with separated colored logs
 * 5. Mirrors each app log to `.logs/<app>.log`
 * 6. Keyboard shortcuts to focus one app’s logs (m / a / s / …)
 *
 * Flags:
 *   --no-mobile   skip Expo
 *   --no-website  skip Astro
 *   --no-admin    skip Angular
 *   --functions   also serve Edge Functions
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const logsDirectory = join(rootDirectory, '.logs');
const children = [];

/** `null` = show all apps; otherwise only that appKey */
let logFocus = null;

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  clearScreen: '\x1b[2J\x1b[H',
};

const APP_STYLES = {
  website: { color: ANSI.cyan, label: 'website', shortcut: 's' },
  admin: { color: ANSI.magenta, label: 'admin  ', shortcut: 'a' },
  mobile: { color: ANSI.green, label: 'mobile ', shortcut: 'm' },
  functions: { color: ANSI.blue, label: 'funcs  ', shortcut: 'f' },
};

const SHORTCUT_TO_APP = {
  m: 'mobile',
  a: 'admin',
  s: 'website',
  f: 'functions',
};

function log(message) {
  console.log(`\n${ANSI.yellow}${ANSI.bold}[tourose]${ANSI.reset} ${message}`);
}

function fail(message) {
  console.error(`\n${ANSI.yellow}${ANSI.bold}[tourose]${ANSI.reset} ${message}`);
  process.exit(1);
}

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: 'utf8',
    shell: false,
    ...options,
  });
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

function ensureLogsDirectory() {
  mkdirSync(logsDirectory, { recursive: true });
  writeFileSync(
    join(logsDirectory, 'README.txt'),
    `Logs TouRose générés par pnpm dev:up

Chaque app écrit dans son fichier (sans mélange) :
  website.log
  admin.log
  mobile.log
  functions.log

Dans le terminal dev:up, appuie sur une touche :
  m  mobile
  a  admin
  s  site (website)
  f  functions
  t  tout (mélange coloré)
  c  clear
  h  aide
  q  quitter

Ou en parallèle :
  tail -f .logs/mobile.log
`,
    'utf8',
  );
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
  importCronSecret: ${JSON.stringify(process.env.IMPORT_CRON_SECRET ?? 'local-import-secret')},
} as const;
`,
  );

  return { apiUrl, anonKey, studioUrl: 'http://127.0.0.1:54323' };
}

function shouldShowApp(appKey) {
  return logFocus === null || logFocus === appKey;
}

function writePrefixedLines(appKey, chunk, stream) {
  if (!shouldShowApp(appKey)) return;

  const style = APP_STYLES[appKey] ?? { color: ANSI.gray, label: appKey.padEnd(7) };
  const prefix = `${style.color}${ANSI.bold}[${style.label}]${ANSI.reset}`;
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    stream.write(`${prefix} ${line}\n`);
  }
}

function spawnDev(appKey, command, args, envOverrides = {}) {
  const style = APP_STYLES[appKey] ?? { color: ANSI.gray, label: appKey };
  log(`Démarrage ${style.label.trim()}…`);

  const logFilePath = join(logsDirectory, `${appKey}.log`);
  const logStream = createWriteStream(logFilePath, { flags: 'w' });
  logStream.write(`# ${appKey} — démarré ${new Date().toISOString()}\n`);

  const child = spawn(command, args, {
    cwd: rootDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      ...envOverrides,
    },
  });
  children.push({ name: appKey, child, logStream });

  child.stdout.on('data', (chunk) => {
    writePrefixedLines(appKey, chunk, process.stdout);
    logStream.write(chunk);
  });
  child.stderr.on('data', (chunk) => {
    writePrefixedLines(appKey, chunk, process.stderr);
    logStream.write(chunk);
  });
  child.on('exit', (code) => {
    if (shouldShowApp(appKey)) {
      console.warn(
        `${ANSI.yellow}[tourose]${ANSI.reset} ${appKey} s’est arrêté (code ${code ?? '?'})`,
      );
    }
    logStream.write(`\n# exit ${code ?? '?'}\n`);
    logStream.end();
  });
}

function shutdown() {
  restoreStdin();
  log('Arrêt des apps locales…');
  for (const entry of children) {
    try {
      entry.child.kill('SIGTERM');
    } catch {
      // ignore
    }
    try {
      entry.logStream?.end();
    } catch {
      // ignore
    }
  }
  log('Astuce : `pnpm dev:down` arrête aussi Supabase.');
  process.exit(0);
}

function findLanIpAddress() {
  let interfaces;
  try {
    interfaces = networkInterfaces();
  } catch {
    return null;
  }
  for (const interfaceList of Object.values(interfaces)) {
    for (const networkInterface of interfaceList ?? []) {
      if (networkInterface.family === 'IPv4' && !networkInterface.internal) {
        return networkInterface.address;
      }
    }
  }
  return null;
}

async function printExpoQrCode() {
  const lanIpAddress = findLanIpAddress();
  if (!lanIpAddress) {
    log('Pas d’IP locale détectée — ouvre Expo Go et saisis exp://<ip-du-mac>:8081');
    return;
  }

  const expoUrl = `exp://${lanIpAddress}:8081`;
  const { default: qrcodeTerminal } = await import('qrcode-terminal');

  console.log(`\n${ANSI.green}${ANSI.bold}[mobile ]${ANSI.reset} Scanne ce QR avec Expo Go (même Wi-Fi) :\n`);
  await new Promise((resolve) => {
    qrcodeTerminal.generate(expoUrl, { small: true }, (qrOutput) => {
      console.log(qrOutput);
      resolve();
    });
  });
  console.log(`${ANSI.green}${ANSI.bold}[mobile ]${ANSI.reset} URL manuelle : ${expoUrl}\n`);
}

function printShortcutsBanner() {
  console.log(`
${ANSI.bold}╔══════════════════════════════════════════════════════════╗
║  Raccourcis logs (ce terminal)                           ║
╠══════════════════════════════════════════════════════════╣${ANSI.reset}
║  ${ANSI.green}m${ANSI.reset}  mobile          ${ANSI.magenta}a${ANSI.reset}  admin           ${ANSI.cyan}s${ANSI.reset}  site          ║
║  ${ANSI.blue}f${ANSI.reset}  functions       ${ANSI.yellow}t${ANSI.reset}  tout (mélange)  ${ANSI.gray}c${ANSI.reset}  clear         ║
║  ${ANSI.gray}h${ANSI.reset}  aide (reaffiche)                 ${ANSI.gray}q${ANSI.reset}  quitter       ║
${ANSI.bold}╚══════════════════════════════════════════════════════════╝${ANSI.reset}
`);
}

function printSummary(config, options) {
  const mobileLine = options.withMobile
    ? '║  Mobile Expo     : QR ci-dessous ([mobile]) — port 8081  ║'
    : '║  Mobile          : désactivé (--no-mobile)               ║';

  console.log(`
${ANSI.bold}╔══════════════════════════════════════════════════════════╗
║  TouRose — environnement local prêt                      ║
╠══════════════════════════════════════════════════════════╣${ANSI.reset}
║  Studio Supabase : ${config.studioUrl.padEnd(36)}║
║  API Supabase    : ${config.apiUrl.padEnd(36)}║
║  Website         : http://localhost:4321                 ║
║  Admin           : http://localhost:4200                 ║
${mobileLine}
╠══════════════════════════════════════════════════════════╣
║  Admin login : admin@tourose.local / tourose-admin-local ║
║  Arrêt apps  : q  ou  Ctrl+C                             ║
║  Arrêt + DB  : pnpm dev:down                             ║
${ANSI.bold}╚══════════════════════════════════════════════════════════╝${ANSI.reset}
`);
  printShortcutsBanner();
}

function readRecentLogLines(appKey, maxLines = 40) {
  const logFilePath = join(logsDirectory, `${appKey}.log`);
  if (!existsSync(logFilePath)) return [];
  try {
    const content = readFileSync(logFilePath, 'utf8');
    return content
      .split(/\r?\n/)
      .filter((line) => line.length > 0)
      .slice(-maxLines);
  } catch {
    return [];
  }
}

function setLogFocus(nextFocus) {
  logFocus = nextFocus;
  process.stdout.write(ANSI.clearScreen);

  if (logFocus === null) {
    log('Mode logs : TOUT (mélange coloré). Raccourcis : m a s f  ·  t=tout  ·  h=aide  ·  q=quit');
    return;
  }

  const style = APP_STYLES[logFocus] ?? { color: ANSI.gray, label: logFocus };
  const label = style.label.trim();
  console.log(
    `\n${style.color}${ANSI.bold}[tourose]${ANSI.reset} Mode logs : ${style.color}${ANSI.bold}${label}${ANSI.reset} uniquement  (t = tout · h = aide · q = quit)\n`,
  );

  const recentLines = readRecentLogLines(logFocus);
  if (recentLines.length === 0) {
    console.log(`${ANSI.dim}(pas encore de logs — en attente…)${ANSI.reset}\n`);
    return;
  }

  console.log(`${ANSI.dim}── derniers logs ──${ANSI.reset}`);
  for (const line of recentLines) {
    process.stdout.write(`${style.color}${ANSI.bold}[${style.label}]${ANSI.reset} ${line}\n`);
  }
  console.log(`${ANSI.dim}── live ──${ANSI.reset}\n`);
}

function printHelp() {
  printShortcutsBanner();
  const focusLabel =
    logFocus === null ? 'tout' : (APP_STYLES[logFocus]?.label.trim() ?? logFocus);
  log(`Focus actuel : ${focusLabel}`);
}

function restoreStdin() {
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // ignore
    }
  }
}

function enableKeyboardShortcuts() {
  if (!process.stdin.isTTY) {
    log(
      'Terminal non interactif — raccourcis désactivés. Utilise `tail -f .logs/mobile.log` dans un autre onglet.',
    );
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    // Ctrl+C
    if (key === '\u0003') {
      shutdown();
      return;
    }

    const pressedKey = key.toLowerCase();

    if (pressedKey === 'q') {
      shutdown();
      return;
    }

    if (pressedKey === 'h' || pressedKey === '?') {
      printHelp();
      return;
    }

    if (pressedKey === 'c') {
      process.stdout.write(ANSI.clearScreen);
      const focusLabel =
        logFocus === null ? 'tout' : (APP_STYLES[logFocus]?.label.trim() ?? logFocus);
      log(`Écran vidé — focus : ${focusLabel}`);
      return;
    }

    if (pressedKey === 't' || pressedKey === '*' || pressedKey === '\r' || pressedKey === '\n') {
      setLogFocus(null);
      return;
    }

    const appKey = SHORTCUT_TO_APP[pressedKey];
    if (!appKey) return;

    const isRunning = children.some((entry) => entry.name === appKey);
    if (!isRunning) {
      log(
        `Pas de process « ${appKey} » (relance avec le bon flag, ex. --functions pour f).`,
      );
      return;
    }

    setLogFocus(appKey);
  });
}

const withMobile = !hasFlag('--no-mobile');
const withWebsite = !hasFlag('--no-website');
const withAdmin = !hasFlag('--no-admin');
const withFunctions = hasFlag('--functions');

ensureDocker();
ensureDependencies();
ensureLogsDirectory();
const supabase = startSupabase();
const config = syncAppEnv(supabase);
printSummary(config, { withMobile });

if (withMobile) {
  // Expo hides its QR when output is piped (non-TTY), so we render it ourselves
  // before the app logs start — it stays clean and never gets mixed.
  await printExpoQrCode();
}

if (withWebsite) {
  spawnDev(
    'website',
    'pnpm',
    [
      '--filter',
      '@tourose/website',
      'exec',
      'astro',
      'dev',
      '--host',
      '127.0.0.1',
      '--port',
      '4321',
    ],
  );
}

if (withAdmin) {
  spawnDev(
    'admin',
    'pnpm',
    [
      '--filter',
      '@tourose/admin',
      'exec',
      'ng',
      'serve',
      '--host',
      '127.0.0.1',
      '--port',
      '4200',
    ],
  );
}

if (withMobile) {
  // stdin is claimed by our shortcuts; Expo keeps Metro watch (no CI=1).
  // `--go` targets Expo Go (the project also has expo-dev-client).
  spawnDev(
    'mobile',
    'pnpm',
    ['--filter', '@tourose/mobile', 'exec', 'expo', 'start', '--go', '--port', '8081'],
    { EXPO_NO_TELEMETRY: '1', CI: undefined },
  );
}

if (withFunctions) {
  spawnDev(
    'functions',
    'pnpm',
    ['exec', 'supabase', 'functions', 'serve', '--env-file', 'supabase/functions/.env'],
  );
}

enableKeyboardShortcuts();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
