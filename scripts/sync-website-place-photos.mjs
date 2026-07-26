#!/usr/bin/env node
/* global process, console, fetch, URLSearchParams */
/**
 * Télécharge une photo de couverture Wikimedia Commons par lieu éditorial
 * vers apps/website/public/catalog/photos/places/{slug}.jpg
 * et génère le manifeste consommé par resolvePlaceCoverImage().
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(rootDirectory, 'apps/website/public/catalog/photos/places');
const manifestPath = join(rootDirectory, 'apps/website/src/lib/place-cover-manifest.json');
const creditsPath = join(rootDirectory, 'apps/website/public/catalog/photos/places/CREDITS.md');

/** Aligné sur scripts/import-editorial-place-photos.mjs */
const COMMONS_CATEGORIES_BY_SLUG = {
  'place-du-capitole': ['Place du Capitole (Toulouse)', 'Capitole de Toulouse'],
  'basilique-saint-sernin': ['Basilique Saint-Sernin (Toulouse)'],
  'couvent-des-jacobins': ['Couvent des Jacobins de Toulouse'],
  'musee-des-augustins': ['Musée des Augustins de Toulouse'],
  'musee-saint-raymond': ['Musée Saint-Raymond de Toulouse', 'Musée Saint-Raymond'],
  'jardin-des-plantes': ['Jardin des Plantes de Toulouse'],
  'jardin-du-grand-rond': ['Grand Rond (jardin)'],
  'prairie-des-filtres': ['Prairie des Filtres'],
  'jardin-japonais-compans': ['Jardin japonais, Toulouse'],
  'quais-de-la-garonne': ['Quais de Toulouse', 'Garonne in Toulouse'],
  'pont-neuf-toulouse': ['Pont-Neuf de Toulouse'],
  'les-abattoirs': ['Les Abattoirs'],
  'cite-de-lespace': ["Cité de l'espace"],
  'halle-de-la-machine': ['Halle de La Machine'],
  'belvedere-pech-david': ['Pech David', 'Belvédère de Pech David'],
  'canal-du-midi-port-saint-sauveur': [
    'Port Saint-Sauveur (Toulouse)',
    'Canal du Midi in Toulouse',
  ],
  'parc-de-la-maourine': ['Parc de la Maourine'],
  'marche-victor-hugo': ['Marché Victor Hugo (Toulouse)'],
  'place-saint-georges': ['Place Saint-Georges (Toulouse)'],
  'cathedrale-saint-etienne': ['Cathédrale Saint-Étienne de Toulouse'],
  'fondation-bemberg': ["Hôtel d'Assézat"],
  'quai-des-savoirs': ['Quai des Savoirs', 'Quai des savoirs (Toulouse)'],
  'jardin-raymond-vi': ['Jardin Raymond VI', 'Prairie des Filtres'],
  'rue-du-taur-flanerie': ['Rue du Taur (Toulouse)'],
  'bon-plan-coucher-soleil-saint-pierre': ['Place Saint-Pierre (Toulouse)'],
  'musee-georges-labit': ['Musée Georges Labit'],
  'parc-de-la-vache': ['Parc de la Vache (Toulouse)'],
  'basilique-notre-dame-de-la-daurade': ['Basilique Notre-Dame de la Daurade'],
};

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function metadataValue(metadata, key) {
  return metadata?.[key]?.value ? stripHtml(metadata[key].value) : '';
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchCategoryFiles(categoryName) {
  const parameters = new URLSearchParams({
    action: 'query',
    generator: 'categorymembers',
    gcmtitle: `Category:${categoryName}`,
    gcmtype: 'file',
    gcmlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1600',
    format: 'json',
    origin: '*',
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, {
      headers: { 'User-Agent': 'TouRose/0.1 (website place cover sync)' },
    });
    if (response.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!response.ok) return [];
    const body = await response.json();
    return Object.values(body.query?.pages ?? {});
  }
  return [];
}

function isPhotographicFile(title) {
  return /\.(jpe?g|png)$/i.test(title ?? '');
}

function pickLicensedCandidate(files) {
  for (const candidate of files) {
    const imageInfo = candidate.imageinfo?.[0];
    const metadata = imageInfo?.extmetadata;
    const remoteUrl = imageInfo?.thumburl ?? imageInfo?.url;
    const author = metadataValue(metadata, 'Artist') || metadataValue(metadata, 'Credit');
    const licenseName = metadataValue(metadata, 'LicenseShortName');
    const licenseUrl = metadataValue(metadata, 'LicenseUrl');
    const nonFree = metadataValue(metadata, 'NonFree').toLowerCase() === 'true';

    if (
      !remoteUrl?.startsWith('https://upload.wikimedia.org/') ||
      !imageInfo?.descriptionurl ||
      !author ||
      !licenseName ||
      !licenseUrl ||
      nonFree
    ) {
      continue;
    }

    return {
      remoteUrl,
      author,
      licenseName,
      sourceUrl: imageInfo.descriptionurl,
      title: candidate.title?.replace(/^File:/, '') ?? candidate.title,
    };
  }
  return null;
}

async function downloadImage(remoteUrl, destinationPath) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(remoteUrl, {
      headers: { 'User-Agent': 'TouRose/0.1 (website place cover sync)' },
    });
    if (response.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${remoteUrl}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(destinationPath, buffer);
    return;
  }
  throw new Error(`HTTP 429 (rate limit) for ${remoteUrl}`);
}

async function resolveCoverForSlug(slug) {
  const categories = COMMONS_CATEGORIES_BY_SLUG[slug] ?? [];
  for (const categoryName of categories) {
    const files = (await fetchCategoryFiles(categoryName)).filter((candidate) =>
      isPhotographicFile(candidate.title ?? ''),
    );
    const picked = pickLicensedCandidate(files);
    if (picked) return picked;
  }
  return null;
}

mkdirSync(outputDirectory, { recursive: true });

const manifestEntries = [];
const creditRows = [];

for (const slug of Object.keys(COMMONS_CATEGORIES_BY_SLUG)) {
  const destinationPath = join(outputDirectory, `${slug}.jpg`);
  const alreadyPresent = existsSync(destinationPath);

  let cover = null;
  if (!alreadyPresent) {
    cover = await resolveCoverForSlug(slug);
    if (cover) {
      await downloadImage(cover.remoteUrl, destinationPath);
      console.log(`[sync:website-photos] ${slug} → ${destinationPath}`);
    } else {
      console.log(`[sync:website-photos] ${slug} → aucune photo licenciée`);
    }
    await sleep(1200);
  } else {
    console.log(`[sync:website-photos] ${slug} → déjà présent, ignoré`);
  }

  if (existsSync(destinationPath)) {
    manifestEntries.push(slug);
    if (cover) {
      creditRows.push({
        slug,
        file: `${slug}.jpg`,
        author: cover.author,
        license: cover.licenseName,
        source: cover.sourceUrl,
      });
    }
  }
}

writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      slugs: manifestEntries.sort(),
    },
    null,
    2,
  ) + '\n',
);

const creditsMarkdown = [
  '# Crédits — photos lieux (Wikimedia Commons)',
  '',
  'Généré par `pnpm run sync:website-place-photos`.',
  '',
  '| Lieu | Fichier | Auteur | Licence | Source |',
  '| --- | --- | --- | --- | --- |',
  ...creditRows.map(
    (row) =>
      `| ${row.slug} | ${row.file} | ${row.author.replace(/\|/g, '\\|')} | ${row.license} | [Commons](${row.source}) |`,
  ),
  '',
].join('\n');
writeFileSync(creditsPath, creditsMarkdown);

console.log(
  JSON.stringify(
    {
      downloadedOrPresent: manifestEntries.length,
      targeted: Object.keys(COMMONS_CATEGORIES_BY_SLUG).length,
      manifestPath,
    },
    null,
    2,
  ),
);
