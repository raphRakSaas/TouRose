#!/usr/bin/env node
/* global process, console, fetch, URLSearchParams */
/* eslint-disable no-console -- ce CLI affiche sa progression et son bilan */
/**
 * Enrichit les lieux éditoriaux TouRose avec jusqu'à 3 photos Wikimedia Commons.
 *
 * Contrairement à `import-wikimedia-places` (recherche floue), ce script utilise
 * une catégorie Commons curée par lieu : fiable pour des monuments célèbres.
 *
 * Sécurité :
 * - Supabase local uniquement ;
 * - import uniquement si auteur + licence + URL de licence sont disponibles ;
 * - aucune image copiée localement (URL distante + attribution conservées).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const maximumPhotosPerPlace = 3;

/**
 * Catégories Wikimedia Commons curées par slug de lieu éditorial.
 * Plusieurs candidates possibles : la première qui renvoie des fichiers gagne.
 */
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
  'canal-du-midi-port-saint-sauveur': ['Port Saint-Sauveur (Toulouse)', 'Canal du Midi in Toulouse'],
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

function fail(message) {
  console.error(`[import:editorial-photos] ${message}`);
  process.exit(1);
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

async function postgrest(path, options = {}) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  const bodyText = await response.text();
  return bodyText ? JSON.parse(bodyText) : null;
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
    gcmlimit: '30',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1400',
    format: 'json',
    origin: '*',
  });
  // Commons applique un rate-limit : on réessaie avec back-off sur 429.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, {
      headers: { 'User-Agent': 'TouRose/0.1 (editorial place media importer)' },
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
  return /\.(jpe?g|png)$/i.test(title);
}

async function ensureMediaAsset(candidate) {
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
    return null;
  }

  const encodedUrl = encodeURIComponent(remoteUrl);
  const existingRows = await postgrest(
    `media_assets?select=id&remote_url=eq.${encodedUrl}&limit=1`,
  );
  if (existingRows?.[0]?.id) return existingRows[0].id;

  const attribution =
    metadataValue(metadata, 'Attribution') || `${author} · ${licenseName} · Wikimedia Commons`;
  const insertedRows = await postgrest('media_assets?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      remote_url: remoteUrl,
      width_px: imageInfo.thumbwidth ?? imageInfo.width ?? null,
      height_px: imageInfo.thumbheight ?? imageInfo.height ?? null,
      alt_text: candidate.title.replace(/^File:/, ''),
      author,
      source_url: imageInfo.descriptionurl,
      license_name: licenseName,
      license_url: licenseUrl,
      attribution_text: attribution,
      cache_permission: false,
      rights_status: 'allowed',
      reviewed_at: new Date().toISOString(),
    }),
  });
  return insertedRows?.[0]?.id ?? null;
}

const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
  cwd: rootDirectory,
  encoding: 'utf8',
});
if (status.status !== 0) fail('Supabase local inaccessible. Lance `pnpm supabase:start`.');

const environment = parseStatusEnv(status.stdout);
const apiUrl = environment.API_URL ?? 'http://127.0.0.1:54321';
const serviceRoleKey = environment.SERVICE_ROLE_KEY ?? environment.SECRET_KEY;
if (!serviceRoleKey) fail('SERVICE_ROLE_KEY locale manquante.');
if (!apiUrl.includes('127.0.0.1') && !apiUrl.includes('localhost')) {
  fail('Refus : ce script est réservé au Supabase local.');
}

const slugs = Object.keys(COMMONS_CATEGORIES_BY_SLUG);
const slugFilter = slugs.map((slug) => `"${slug}"`).join(',');
const [editorialPlaces, existingPlaceMedia] = await Promise.all([
  postgrest(`places?select=id,slug,name&status=eq.published&slug=in.(${slugFilter})`),
  postgrest('entity_media?select=entity_id&entity_type=eq.place'),
]);
const placeIdsWithMedia = new Set(existingPlaceMedia.map((link) => link.entity_id));
const places = (editorialPlaces ?? []).filter((place) => !placeIdsWithMedia.has(place.id));

let enrichedPlaces = 0;
let linkedPhotos = 0;

for (const place of places) {
  const categories = COMMONS_CATEGORIES_BY_SLUG[place.slug] ?? [];
  let files = [];
  for (const categoryName of categories) {
    files = (await fetchCategoryFiles(categoryName)).filter((candidate) =>
      isPhotographicFile(candidate.title ?? ''),
    );
    if (files.length > 0) break;
  }

  let placePhotoCount = 0;
  for (const candidate of files) {
    if (placePhotoCount >= maximumPhotosPerPlace) break;
    const mediaId = await ensureMediaAsset(candidate);
    if (!mediaId) continue;
    await postgrest('entity_media?on_conflict=entity_type,entity_id,media_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        entity_type: 'place',
        entity_id: place.id,
        media_id: mediaId,
        position: placePhotoCount,
        is_cover: placePhotoCount === 0,
      }),
    });
    placePhotoCount += 1;
    linkedPhotos += 1;
  }
  if (placePhotoCount > 0) {
    enrichedPlaces += 1;
    console.log(`[import:editorial-photos] ${place.slug} → ${placePhotoCount} photo(s)`);
  } else {
    console.log(`[import:editorial-photos] ${place.slug} → aucune photo licenciée trouvée`);
  }
  // Throttle doux pour rester poli avec l'API Commons.
  await sleep(700);
}

console.log(
  JSON.stringify(
    {
      targetedPlaces: places.length,
      enrichedPlaces,
      linkedPhotos,
      maximumPhotosPerPlace,
    },
    null,
    2,
  ),
);
