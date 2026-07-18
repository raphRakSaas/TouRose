#!/usr/bin/env node
/**
 * Find OpenAgenda agendas (and their UID) by keyword.
 *
 * Usage:
 *   pnpm openagenda:find -- --search "Toulouse"
 *
 * Reads OPENAGENDA_PUBLIC_KEY from the environment or supabase/functions/.env.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`[openagenda:find] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const searchIndex = argv.indexOf('--search');
  if (searchIndex === -1 || !argv[searchIndex + 1]) {
    fail('Usage: pnpm openagenda:find -- --search "Toulouse"');
  }
  return { searchTerm: argv[searchIndex + 1].trim() };
}

function readFunctionsEnv() {
  try {
    const envContent = readFileSync(join(rootDirectory, 'supabase/functions/.env'), 'utf8');
    const values = {};
    for (const line of envContent.split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) values[match[1]] = match[2].trim();
    }
    return values;
  } catch {
    return {};
  }
}

const { searchTerm } = parseArgs(process.argv.slice(2));
const functionsEnv = readFunctionsEnv();
const publicKey = process.env.OPENAGENDA_PUBLIC_KEY ?? functionsEnv.OPENAGENDA_PUBLIC_KEY;

if (!publicKey) {
  fail(
    'OPENAGENDA_PUBLIC_KEY manquant. Ajoute-le dans supabase/functions/.env (compte OpenAgenda → Paramètres → API).',
  );
}

const url = new URL('https://api.openagenda.com/v2/agendas');
url.searchParams.set('search', searchTerm);
url.searchParams.set('size', '20');

const response = await fetch(url, { headers: { key: publicKey } });
if (!response.ok) {
  fail(`OpenAgenda HTTP ${response.status} — vérifie ta clé publique.`);
}

const body = await response.json();
const agendas = body.agendas ?? [];

if (agendas.length === 0) {
  console.log(`Aucun agenda trouvé pour « ${searchTerm} ».`);
  process.exit(0);
}

console.log(`Agendas trouvés pour « ${searchTerm} » :\n`);
for (const agenda of agendas) {
  console.log(`  UID: ${agenda.uid}`);
  console.log(`  Titre: ${agenda.title ?? '(sans titre)'}`);
  console.log(`  Slug: ${agenda.slug ?? ''}`);
  console.log(`  Officiel: ${agenda.official ? 'oui' : 'non'}`);
  console.log('');
}

console.log(
  'Copie le UID choisi dans supabase/functions/.env → OPENAGENDA_AGENDA_UID=<uid>, puis relance la function et `pnpm import:openagenda`.',
);
