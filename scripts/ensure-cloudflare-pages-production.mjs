#!/usr/bin/env node
/**
 * Ensure Cloudflare Pages production_branch matches CI deploy branch (idempotent).
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_PAGES_PROJECT (or CLOUDFLARE_PAGES_PROJECT_WEBSITE)
 * Optional:
 *   CLOUDFLARE_PAGES_PRODUCTION_BRANCH (default: production)
 */
function requireEnv(primaryName, fallbackName) {
  const value = process.env[primaryName]?.trim() || process.env[fallbackName]?.trim();
  if (!value) {
    console.error(
      `[ensure-cloudflare-pages] Missing ${primaryName}${fallbackName ? ` (or ${fallbackName})` : ''}`,
    );
    process.exit(1);
  }
  return value;
}

const apiToken = requireEnv('CLOUDFLARE_API_TOKEN');
const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
const projectName = requireEnv('CLOUDFLARE_PAGES_PROJECT', 'CLOUDFLARE_PAGES_PROJECT_WEBSITE');
const productionBranch = process.env.CLOUDFLARE_PAGES_PRODUCTION_BRANCH?.trim() || 'production';

const projectUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`;

const getResponse = await fetch(projectUrl, {
  headers: { Authorization: `Bearer ${apiToken}` },
});

const getBody = await getResponse.json();
if (!getResponse.ok || !getBody.success) {
  console.error('[ensure-cloudflare-pages] Failed to read project:', JSON.stringify(getBody));
  process.exit(1);
}

const currentBranch = getBody.result?.production_branch?.trim();
if (currentBranch === productionBranch) {
  console.log(
    `[ensure-cloudflare-pages] production_branch already "${productionBranch}" on ${projectName}`,
  );
  process.exit(0);
}

console.log(
  `[ensure-cloudflare-pages] Setting production_branch "${currentBranch ?? '(unset)'}" → "${productionBranch}" on ${projectName}`,
);

const patchResponse = await fetch(projectUrl, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ production_branch: productionBranch }),
});

const patchBody = await patchResponse.json();
if (!patchResponse.ok || !patchBody.success) {
  console.error('[ensure-cloudflare-pages] Failed to update project:', JSON.stringify(patchBody));
  process.exit(1);
}

console.log(`[ensure-cloudflare-pages] production_branch set to "${productionBranch}"`);
