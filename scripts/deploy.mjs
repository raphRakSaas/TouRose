#!/usr/bin/env node
/**
 * Assistant interactif de release TouRose.
 *
 * Usage:
 *   pnpm release
 *   pnpm release -- --type fix --scope mobile --message "corrige le checkout stripe"
 *   pnpm release -- --delete-tag v0.1.0
 *   pnpm release -- --no-check --yes
 */
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');

const VERSION_FILES = [
  'package.json',
  'apps/mobile/package.json',
  'apps/mobile/app.json',
  'apps/website/package.json',
  'apps/admin/package.json',
  'packages/contracts/package.json',
  'packages/design-tokens/package.json',
  'packages/shared/package.json',
  'packages/config-typescript/package.json',
];

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message) {
  console.log(`${ANSI.yellow}${ANSI.bold}[deploy]${ANSI.reset} ${message}`);
}

function success(message) {
  console.log(`${ANSI.green}${ANSI.bold}[deploy]${ANSI.reset} ${message}`);
}

function fail(message, exitCode = 1) {
  console.error(`${ANSI.red}${ANSI.bold}[deploy]${ANSI.reset} ${message}`);
  process.exit(exitCode);
}

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

function readArg(flagName) {
  const flagIndex = process.argv.indexOf(flagName);
  if (flagIndex === -1) {
    return null;
  }
  return process.argv[flagIndex + 1] ?? null;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDirectory,
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
    shell: false,
    ...options,
  });
  return result;
}

function runOrFail(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    fail(`Échec : ${command} ${args.join(' ')}`);
  }
  return result;
}

function runCapture(command, args) {
  const result = run(command, args, { silent: true });
  if (result.status !== 0) {
    fail(`Échec : ${command} ${args.join(' ')}`);
  }
  return (result.stdout ?? '').trim();
}

function readRootVersion() {
  const packageJsonPath = join(rootDirectory, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function parseSemver(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/);
  if (!match) {
    fail(`Version invalide : ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatSemver(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function bumpVersion(currentVersion, releaseType) {
  const parts = parseSemver(currentVersion);
  if (releaseType === 'fix') {
    parts.patch += 1;
  } else if (releaseType === 'feature') {
    parts.minor += 1;
    parts.patch = 0;
  } else if (releaseType === 'breaking') {
    parts.major += 1;
    parts.minor = 0;
    parts.patch = 0;
  } else {
    fail(`Type de release inconnu : ${releaseType}`);
  }
  return formatSemver(parts);
}

function writeVersions(nextVersion) {
  for (const relativePath of VERSION_FILES) {
    const absolutePath = join(rootDirectory, relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }
    const fileContent = JSON.parse(readFileSync(absolutePath, 'utf8'));
    fileContent.version = nextVersion;
    writeFileSync(absolutePath, `${JSON.stringify(fileContent, null, 2)}\n`, 'utf8');
  }
}

function getGitBranch() {
  return runCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
}

function getLatestTag() {
  const tag = run('git', ['describe', '--tags', '--abbrev=0'], { silent: true });
  if (tag.status !== 0) {
    return null;
  }
  return (tag.stdout ?? '').trim() || null;
}

function listTags() {
  const output = runCapture('git', ['tag', '--sort=-v:refname']);
  return output ? output.split('\n').filter(Boolean) : [];
}

function tagExists(tagName) {
  const result = run('git', ['rev-parse', `refs/tags/${tagName}`], { silent: true });
  return result.status === 0;
}

function getRemoteUrl() {
  const result = run('git', ['remote', 'get-url', 'origin'], { silent: true });
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout ?? '').trim();
}

function toGitHubActionsUrl(remoteUrl) {
  if (!remoteUrl) {
    return 'https://github.com/<org>/<repo>/actions';
  }
  const sshMatch = remoteUrl.match(/git@github\.com:(.+)\.git$/);
  const httpsMatch = remoteUrl.match(/github\.com[/:](.+?)(?:\.git)?$/);
  const repositoryPath = sshMatch?.[1] ?? httpsMatch?.[1];
  if (!repositoryPath) {
    return 'https://github.com/<org>/<repo>/actions';
  }
  return `https://github.com/${repositoryPath}/actions`;
}

async function ask(rl, question, defaultValue = '') {
  const suffix = defaultValue ? ` ${ANSI.dim}(${defaultValue})${ANSI.reset}` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || defaultValue;
}

async function confirm(rl, question, defaultYes = false) {
  const hint = defaultYes ? 'O/n' : 'o/N';
  const answer = (await rl.question(`${question} (${hint}) : `)).trim().toLowerCase();
  if (!answer) {
    return defaultYes;
  }
  return answer === 'o' || answer === 'oui' || answer === 'y' || answer === 'yes';
}

function printHeader() {
  console.log('');
  console.log(`${ANSI.cyan}${ANSI.bold}TouRose — assistant de release${ANSI.reset}`);
  console.log(
    `${ANSI.dim}Branche : ${getGitBranch()} · version actuelle : v${readRootVersion()} · dernier tag : ${getLatestTag() ?? 'aucun'}${ANSI.reset}`,
  );
  console.log('');
}

async function chooseReleaseType(rl) {
  const cliType = readArg('--type');
  if (cliType) {
    return cliType;
  }

  console.log('Type de release :');
  console.log('  1) fix        — correctif (patch)      ex. 0.1.0 → 0.1.1');
  console.log('  2) feature    — nouvelle fonction      ex. 0.1.0 → 0.2.0');
  console.log('  3) breaking   — changement majeur      ex. 0.1.0 → 1.0.0');
  console.log('  4) custom     — version manuelle');
  console.log('  5) retag      — recréer un tag existant sur HEAD');
  console.log('  6) delete-tag — supprimer un tag local/distant');
  console.log('  7) annuler');
  console.log('');

  const choice = await ask(rl, 'Choix', '1');
  const mapping = {
    1: 'fix',
    2: 'feature',
    3: 'breaking',
    4: 'custom',
    5: 'retag',
    6: 'delete-tag',
    7: 'cancel',
    fix: 'fix',
    feature: 'feature',
    feat: 'feature',
    breaking: 'breaking',
    custom: 'custom',
    retag: 'retag',
    'delete-tag': 'delete-tag',
    cancel: 'cancel',
  };
  return mapping[choice] ?? 'fix';
}

function buildCommitType(releaseType) {
  if (releaseType === 'fix') {
    return 'fix';
  }
  if (releaseType === 'breaking') {
    return 'feat';
  }
  return 'feat';
}

function buildCommitMessage(releaseType, scope, description, nextVersion) {
  const commitType = buildCommitType(releaseType);
  const scopePart = scope ? `(${scope})` : '';
  const breakingMarker = releaseType === 'breaking' ? '!' : '';
  const subject = `${commitType}${scopePart}${breakingMarker}: ${description}`;
  if (releaseType === 'breaking') {
    return `${subject}\n\nBREAKING CHANGE: ${description}\n\nRelease v${nextVersion}.`;
  }
  return `${subject}\n\nRelease v${nextVersion}.`;
}

async function runQualityGate(rl) {
  if (hasFlag('--no-check')) {
    log('Contrôles qualité ignorés (--no-check).');
    return;
  }

  const skipCheck = hasFlag('--yes')
    ? false
    : !(await confirm(rl, 'Lancer les contrôles qualité avant release ?', true));
  if (skipCheck) {
    log('Contrôles qualité ignorés.');
    return;
  }

  log('Formatage automatique (Prettier)…');
  runOrFail('pnpm', ['run', 'format']);

  log('Contrôles qualité en cours (format, lint, typecheck, test, build)…');
  runOrFail('pnpm', ['run', 'check']);
  success('Contrôles qualité OK.');
}

async function ensureCleanOrCommit(rl, releaseType, nextVersion, scope, description) {
  const status = runCapture('git', ['status', '--porcelain']);
  if (!status) {
    return;
  }

  log('Des changements non commités ont été détectés :');
  console.log(status);
  console.log('');

  if (hasFlag('--yes')) {
    const commitMessage = buildCommitMessage(releaseType, scope, description, nextVersion);
    runOrFail('git', ['add', '-A']);
    runOrFail('git', ['commit', '-m', commitMessage]);
    return;
  }

  const shouldCommit = await confirm(rl, 'Créer un commit avec ces changements ?', true);
  if (!shouldCommit) {
    fail('Release annulée : working tree non propre.');
  }

  const commitMessage = buildCommitMessage(releaseType, scope, description, nextVersion);
  runOrFail('git', ['add', '-A']);
  runOrFail('git', ['commit', '-m', commitMessage]);
}

async function deleteTagFlow(rl) {
  const cliTag = readArg('--delete-tag');
  const tags = listTags();
  if (tags.length > 0) {
    console.log('Tags existants :');
    for (const tagName of tags.slice(0, 15)) {
      console.log(`  - ${tagName}`);
    }
    console.log('');
  }

  const tagName = cliTag ?? (await ask(rl, 'Tag à supprimer', getLatestTag() ?? 'v0.1.0'));
  if (!tagName) {
    fail('Tag requis.');
  }

  const deleteLocal = await confirm(rl, `Supprimer le tag local ${tagName} ?`, true);
  const deleteRemote = await confirm(rl, `Supprimer le tag distant origin/${tagName} ?`, true);

  if (!deleteLocal && !deleteRemote) {
    log('Aucune suppression effectuée.');
    return;
  }

  if (!(hasFlag('--yes') || (await confirm(rl, 'Confirmer la suppression ?', false)))) {
    log('Suppression annulée.');
    return;
  }

  if (deleteLocal && tagExists(tagName)) {
    runOrFail('git', ['tag', '-d', tagName]);
    success(`Tag local supprimé : ${tagName}`);
  } else if (deleteLocal) {
    log(`Tag local introuvable : ${tagName}`);
  }

  if (deleteRemote) {
    runOrFail('git', ['push', 'origin', `:refs/tags/${tagName}`]);
    success(`Tag distant supprimé : ${tagName}`);
  }

  console.log('');
  log('La CI ne se déclenche pas sur une suppression de tag.');
  log('Pour lancer GitHub Actions, relance : pnpm release');
  log('  → choix 1 (fix), 2 (feature) ou 5 (retag) pour créer et pousser un nouveau tag.');
}

async function releaseFlow(rl, releaseType) {
  const currentVersion = readRootVersion();
  let nextVersion = currentVersion;
  let scope = readArg('--scope') ?? '';
  let description = readArg('--message') ?? '';

  if (releaseType === 'custom') {
    nextVersion =
      readArg('--version') ?? (await ask(rl, 'Nouvelle version (sans v)', currentVersion));
    releaseType = await ask(rl, 'Type de commit (fix/feature/breaking)', 'feature');
  } else if (releaseType === 'retag') {
    nextVersion = (await ask(rl, 'Tag à recréer (sans v)', currentVersion)).replace(/^v/, '');
  } else {
    nextVersion = bumpVersion(currentVersion, releaseType);
    const overrideVersion = readArg('--version');
    if (overrideVersion) {
      nextVersion = overrideVersion.replace(/^v/, '');
    } else if (!hasFlag('--yes')) {
      const typedVersion = await ask(rl, 'Version à publier (sans v)', nextVersion);
      nextVersion = typedVersion.replace(/^v/, '');
    }
  }

  if (!scope && !hasFlag('--yes')) {
    scope = await ask(rl, 'Scope commitlint (optionnel)', 'release');
  }
  if (!description) {
    description =
      readArg('--message') ??
      (hasFlag('--yes')
        ? `release v${nextVersion}`
        : await ask(rl, 'Description courte du commit', `release v${nextVersion}`));
  }

  const tagName = `v${nextVersion}`;
  console.log('');
  log(`Release prévue : ${currentVersion} → ${nextVersion}`);
  log(`Tag : ${tagName}`);
  log(`Branche : ${getGitBranch()}`);
  console.log('');

  await runQualityGate(rl);

  if (releaseType !== 'retag') {
    writeVersions(nextVersion);
    log(`Versions mises à jour dans ${VERSION_FILES.length} fichiers.`);
  }

  await ensureCleanOrCommit(rl, releaseType, nextVersion, scope, description);

  if (tagExists(tagName)) {
    const replaceTag =
      hasFlag('--yes') ||
      (await confirm(rl, `Le tag ${tagName} existe déjà. Le remplacer ?`, false));
    if (!replaceTag) {
      fail(`Tag ${tagName} déjà présent.`);
    }
    runOrFail('git', ['tag', '-d', tagName]);
    const remoteDelete = run('git', ['push', 'origin', `:refs/tags/${tagName}`], { silent: true });
    if (remoteDelete.status !== 0) {
      log(`Tag distant ${tagName} absent ou déjà supprimé.`);
    }
  }

  runOrFail('git', ['tag', '-a', tagName, '-m', `Release ${tagName}`]);

  const pushBranch =
    hasFlag('--yes') ||
    (await confirm(rl, `Pousser la branche ${getGitBranch()} vers origin ?`, true));
  if (pushBranch) {
    runOrFail('git', ['push', 'origin', getGitBranch()]);
  }

  const pushTag =
    hasFlag('--yes') || (await confirm(rl, `Pousser le tag ${tagName} vers origin ?`, true));
  if (pushTag) {
    runOrFail('git', ['push', 'origin', tagName]);
  }

  console.log('');
  success(`Release ${tagName} préparée.`);
  console.log(`Suivre la CI : ${toGitHubActionsUrl(getRemoteUrl())}`);
  console.log(
    `${ANSI.dim}Le workflow GitHub "Release (production)" se déclenche sur le tag.${ANSI.reset}`,
  );
}

async function main() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    printHeader();

    const gitRoot = run('git', ['rev-parse', '--show-toplevel'], { silent: true });
    if (gitRoot.status !== 0) {
      fail('Ce dossier n’est pas un dépôt git.');
    }

    let releaseType = await chooseReleaseType(rl);
    if (releaseType === 'cancel') {
      log('Annulé.');
      return;
    }

    if (releaseType === 'delete-tag') {
      await deleteTagFlow(rl);
      return;
    }

    await releaseFlow(rl, releaseType);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
