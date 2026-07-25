#!/usr/bin/env node
/**
 * Deploy Supabase cloud: link project, push migrations, deploy Edge Functions,
 * sync function secrets and cron_runtime for pg_cron (if enabled on the plan).
 *
 * Required env:
 *   SUPABASE_ACCESS_TOKEN
 *   SUPABASE_PROJECT_REF
 *   SUPABASE_DB_PASSWORD
 *   SUPABASE_ANON_KEY
 *   IMPORT_CRON_SECRET
 *
 * Optional env (Edge Function secrets):
 *   OPENAGENDA_PUBLIC_KEY, OPENAGENDA_AGENDA_UID
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *   IMPORT_ALERT_WEBHOOK_URL
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

const EDGE_FUNCTION_NAMES = [
  'health',
  'validate-report',
  'import-openagenda',
  'import-health',
  'register-push-subscription',
  'send-push-notifications',
  'create-support-checkout',
  'stripe-webhook',
];

function fail(message) {
  console.error(`[deploy-supabase] ${message}`);
  process.exit(1);
}

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

function run(command, args, options = {}) {
  runOrFail(command, args, options);
}

function runCapture(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: 'utf8',
    shell: false,
    env: supabaseEnv(),
    ...options,
  });
}

function supabaseEnv() {
  return {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: requireEnv('SUPABASE_ACCESS_TOKEN'),
    SUPABASE_DB_PASSWORD: requireEnv('SUPABASE_DB_PASSWORD'),
  };
}

function runOrFail(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
    env: supabaseEnv(),
    ...options,
  });
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value || null;
}

function escapeSql(value) {
  return value.replace(/'/g, "''");
}

function main() {
  const dryRun = hasFlag('--dry-run');
  const projectRef = requireEnv('SUPABASE_PROJECT_REF');
  const databasePassword = requireEnv('SUPABASE_DB_PASSWORD');
  requireEnv('SUPABASE_ACCESS_TOKEN');
  const anonKey = requireEnv('SUPABASE_ANON_KEY');
  const importCronSecret = requireEnv('IMPORT_CRON_SECRET');

  const functionsBaseUrl = `https://${projectRef}.supabase.co/functions/v1`;

  console.log(`[deploy-supabase] Project ref: ${projectRef}`);
  console.log(`[deploy-supabase] Functions base: ${functionsBaseUrl}`);

  if (dryRun) {
    console.log('[deploy-supabase] Dry run — no changes applied.');
    return;
  }

  runOrFail('pnpm', [
    'exec',
    'supabase',
    'link',
    '--project-ref',
    projectRef,
    '--password',
    databasePassword,
  ]);

  console.log('[deploy-supabase] Applying migrations…');
  runOrFail('pnpm', [
    'exec',
    'supabase',
    'db',
    'push',
    '--linked',
    '--password',
    databasePassword,
  ]);

  console.log('[deploy-supabase] Deploying Edge Functions…');
  for (const functionName of EDGE_FUNCTION_NAMES) {
    runOrFail('pnpm', [
      'exec',
      'supabase',
      'functions',
      'deploy',
      functionName,
      '--project-ref',
      projectRef,
    ]);
  }

  const secretPairs = [
    ['IMPORT_CRON_SECRET', importCronSecret],
    ['OPENAGENDA_PUBLIC_KEY', optionalEnv('OPENAGENDA_PUBLIC_KEY')],
    ['OPENAGENDA_AGENDA_UID', optionalEnv('OPENAGENDA_AGENDA_UID')],
    ['STRIPE_SECRET_KEY', optionalEnv('STRIPE_SECRET_KEY')],
    ['STRIPE_WEBHOOK_SECRET', optionalEnv('STRIPE_WEBHOOK_SECRET')],
    ['IMPORT_ALERT_WEBHOOK_URL', optionalEnv('IMPORT_ALERT_WEBHOOK_URL')],
  ].filter(([, value]) => Boolean(value));

  if (secretPairs.length > 0) {
    console.log('[deploy-supabase] Setting Edge Function secrets…');
    const secretArgs = secretPairs.flatMap(([key, value]) => [`${key}=${value}`]);
    runOrFail('pnpm', [
      'exec',
      'supabase',
      'secrets',
      'set',
      ...secretArgs,
      '--project-ref',
      projectRef,
    ]);
  }

  const cronRuntimeSql = `
insert into private.cron_runtime (key, value, updated_at) values
  ('functions_base_url', '${escapeSql(functionsBaseUrl)}', timezone('utc', now())),
  ('anon_key', '${escapeSql(anonKey)}', timezone('utc', now())),
  ('import_cron_secret', '${escapeSql(importCronSecret)}', timezone('utc', now()))
on conflict (key) do update set
  value = excluded.value,
  updated_at = excluded.updated_at;
`;

  console.log('[deploy-supabase] Syncing cron_runtime for cloud pg_cron…');
  const cronResult = runCapture('pnpm', [
    'exec',
    'supabase',
    'db',
    'query',
    '--linked',
    cronRuntimeSql,
  ]);
  if (cronResult.status === 0) {
    console.log('[deploy-supabase] cron_runtime updated.');
  } else {
    console.warn(
      '[deploy-supabase] cron_runtime sync skipped (pg_cron may be unavailable on this plan).',
    );
  }

  console.log('[deploy-supabase] Done.');
}

main();
