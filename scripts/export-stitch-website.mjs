#!/usr/bin/env node
/**
 * Exporte les écrans Stitch "TouRose Public Web Platform" en HTML local.
 * Usage: STITCH_API_KEY=... node scripts/export-stitch-website.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectId = '5841602793663413564';
const outputDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'DESIGN', 'stitch-tourose-website');

const screens = [
  { screenId: '7c778d4fdde1492a8c5ebe0c4ef1f0b1', fileName: 'accueil.html', title: 'Accueil' },
  { screenId: '55c4a24b97b5496383da9fcb384bbd7e', fileName: 'catalogue.html', title: 'Catalogue' },
  { screenId: '487a83eb749a4a4b82ec9a35f1b6200d', fileName: 'apropos.html', title: 'À propos' },
  { screenId: 'b8824ccc2d9945f1ab9801918e3a2900', fileName: 'soutien.html', title: 'Soutenir' },
  { screenId: '16746238386441ffb7de4efd3ddb95fa', fileName: 'credits.html', title: 'Crédits' },
  { screenId: '81c7f4ef9b5043fd913b6305961f4936', fileName: 'confidentialite.html', title: 'Confidentialité' },
  { screenId: '785543a6d801444ebc4c1699590e6cc6', fileName: 'evenement-detail.html', title: 'Fiche événement' },
  { screenId: '3a032bbe7d0a4699a9c0e7c75667d9bc', fileName: 'lieu-detail.html', title: 'Fiche lieu' },
  { screenId: 'cdca858b129d4992896178adda31335d', fileName: 'soutien-merci.html', title: 'Merci' },
];

if (!process.env.STITCH_API_KEY) {
  console.error('STITCH_API_KEY manquant');
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const manifest = {
  projectId,
  projectTitle: 'TouRose Public Web Platform',
  stitchUrl: 'https://stitch.withgoogle.com/',
  exportedAt: new Date().toISOString(),
  screens: [],
};

for (const screen of screens) {
  const jsonOutput = execFileSync(
    'npx',
    [
      '-y',
      '@_davideast/stitch-mcp',
      'tool',
      'get_screen_code',
      '-d',
      JSON.stringify({ projectId, screenId: screen.screenId }),
      '-o',
      'json',
    ],
    {
      env: { ...process.env },
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024,
    },
  );

  const payload = JSON.parse(jsonOutput);
  if (!payload.htmlContent) {
    console.error(`Échec export ${screen.fileName}`);
    continue;
  }

  const outputPath = join(outputDir, screen.fileName);
  writeFileSync(outputPath, payload.htmlContent, 'utf8');
  manifest.screens.push({ ...screen, path: `DESIGN/stitch-tourose-website/${screen.fileName}` });
  console.log(`✓ ${screen.fileName}`);
}

writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nExport terminé → ${outputDir}`);
