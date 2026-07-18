#!/usr/bin/env node
/**
 * Promote a Supabase Auth user to app_metadata.role = admin (LOCAL ONLY).
 *
 * Usage:
 *   pnpm grant:admin -- --email someone@example.com
 *
 * Requires: Docker + `pnpm supabase:start` (reads service role from `supabase status`).
 * Never point this script at production with a committed secret.
 */
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`[grant:admin] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const emailIndex = argv.indexOf('--email');
  if (emailIndex === -1 || !argv[emailIndex + 1]) {
    fail('Usage: pnpm grant:admin -- --email user@example.com');
  }
  return { email: argv[emailIndex + 1].trim().toLowerCase() };
}

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

const { email } = parseArgs(process.argv.slice(2));

const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  cwd: rootDirectory,
  encoding: 'utf8',
});

if (status.status !== 0) {
  fail('Supabase local inaccessible. Lance `pnpm supabase:start`.');
}

const env = parseStatusEnv(status.stdout);
const apiUrl = env.API_URL;
const serviceRoleKey = env.SERVICE_ROLE_KEY;

if (!apiUrl || !serviceRoleKey) {
  fail('API_URL ou SERVICE_ROLE_KEY manquant dans supabase status.');
}

if (!apiUrl.includes('127.0.0.1') && !apiUrl.includes('localhost')) {
  fail('Refus : ce script est réservé au Supabase local (127.0.0.1 / localhost).');
}

const adminClient = createClient(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const list = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
if (list.error) {
  fail(list.error.message);
}

const targetUser = (list.data.users ?? []).find(
  (user) => (user.email ?? '').toLowerCase() === email,
);

if (!targetUser) {
  fail(
    `Aucun utilisateur Auth avec l’e-mail ${email}. Crée-le d’abord dans Studio → Authentication.`,
  );
}

const existingMetadata =
  targetUser.app_metadata && typeof targetUser.app_metadata === 'object'
    ? targetUser.app_metadata
    : {};

const { data, error } = await adminClient.auth.admin.updateUserById(targetUser.id, {
  app_metadata: {
    ...existingMetadata,
    role: 'admin',
  },
});

if (error) {
  fail(error.message);
}

console.log(`[grant:admin] OK — ${data.user.email} a maintenant app_metadata.role = admin`);
console.log('[grant:admin] Demande à la personne de se reconnecter (ou refreshSession).');
