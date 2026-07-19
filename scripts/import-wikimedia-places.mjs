#!/usr/bin/env node
/* global process, console, fetch, URLSearchParams */
/* eslint-disable no-console -- ce CLI affiche sa progression et son bilan */
/**
 * Enrichit les lieux locaux sans photo avec jusqu'à 3 images Wikimedia Commons.
 *
 * Sécurité :
 * - Supabase local uniquement ;
 * - recherche exacte "<nom du lieu>" Toulouse ;
 * - titre du fichier vérifié avec les mots distinctifs du lieu ;
 * - import uniquement si auteur + licence + URL de licence sont disponibles.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const maxPlaces = Number(process.argv.find((argument) => argument.startsWith('--limit='))?.split('=')[1] ?? 250);
const maximumPhotosPerPlace = 3;
const stopWords = new Set([
  'de',
  'du',
  'des',
  'la',
  'le',
  'les',
  'l',
  'd',
  'et',
  'a',
  'au',
  'aux',
  'toulouse',
  'rue',
  'place',
  'boulevard',
  'allee',
]);
const allowedTitlePrefixes = new Set([
  '31',
  'aerial',
  'facade',
  'immeuble',
  'nouveau',
  'tram',
  'toulouse',
  'view',
  'vue',
]);

function fail(message) {
  console.error(`[import:wikimedia-places] ${message}`);
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

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distinctiveTokens(placeName) {
  return normalizeText(placeName)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function candidateMatchesPlace(placeName, fileTitle) {
  const tokens = distinctiveTokens(placeName);
  if (tokens.length === 0) return false;
  const normalizedTitle = normalizeText(fileTitle);
  const matchingTokens = tokens.filter((token) => normalizedTitle.includes(token));
  if (matchingTokens.length < Math.max(1, Math.ceil(tokens.length * 0.6))) return false;

  const normalizedPlaceName = normalizeText(placeName);
  const exactNameIndex = normalizedTitle.indexOf(normalizedPlaceName);
  if (exactNameIndex < 0) return false;
  const prefixTokens = normalizedTitle.slice(0, exactNameIndex).trim().split(/\s+/).filter(Boolean);
  return prefixTokens.every((token) => allowedTitlePrefixes.has(token));
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

async function searchCommons(placeName) {
  const parameters = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `intitle:"${placeName}" Toulouse`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1400',
    format: 'json',
    origin: '*',
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${parameters}`, {
    headers: { 'User-Agent': 'TouRose/0.1 (local place media importer)' },
  });
  if (!response.ok) return [];
  const body = await response.json();
  return Object.values(body.query?.pages ?? {});
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

const [publishedPlaces, existingPlaceMedia] = await Promise.all([
  postgrest(`places?select=id,name&status=eq.published&order=name.asc&limit=${maxPlaces}`),
  postgrest('entity_media?select=entity_id&entity_type=eq.place'),
]);
const placeIdsWithMedia = new Set(existingPlaceMedia.map((link) => link.entity_id));
const places = publishedPlaces.filter((place) => !placeIdsWithMedia.has(place.id));
let enrichedPlaces = 0;
let linkedPhotos = 0;

for (const [placeIndex, place] of places.entries()) {
  if (distinctiveTokens(place.name).length === 0) continue;
  const candidates = await searchCommons(place.name);
  const matchingCandidates = candidates
    .filter((candidate) => candidateMatchesPlace(place.name, candidate.title))
    .slice(0, maximumPhotosPerPlace);

  let placePhotoCount = 0;
  for (const candidate of matchingCandidates) {
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
  if (placePhotoCount > 0) enrichedPlaces += 1;

  if ((placeIndex + 1) % 25 === 0) {
    console.log(
      `[import:wikimedia-places] ${placeIndex + 1}/${places.length} lieux analysés, ` +
        `${enrichedPlaces} enrichis`,
    );
  }
}

console.log(
  JSON.stringify(
    { analyzedPlaces: places.length, enrichedPlaces, linkedPhotos, maximumPhotosPerPlace },
    null,
    2,
  ),
);
