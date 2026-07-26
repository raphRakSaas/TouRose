#!/usr/bin/env node
/**
 * Verify Cloudflare Pages project exists before deploy.
 *
 * Required env:
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_PAGES_PROJECT (or CLOUDFLARE_PAGES_PROJECT_WEBSITE)
 */
function requireEnv(primaryName, fallbackName) {
  const value = process.env[primaryName]?.trim() || process.env[fallbackName]?.trim();
  if (!value) {
    console.error(
      `[validate-cloudflare-pages] Missing ${primaryName}${fallbackName ? ` (or ${fallbackName})` : ''}`,
    );
    process.exit(1);
  }
  return value;
}

const apiToken = requireEnv('CLOUDFLARE_API_TOKEN');
const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
const projectName = requireEnv('CLOUDFLARE_PAGES_PROJECT', 'CLOUDFLARE_PAGES_PROJECT_WEBSITE');

const projectUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(projectName)}`;

const response = await fetch(projectUrl, {
  headers: { Authorization: `Bearer ${apiToken}` },
});

const body = await response.json();
if (response.ok && body.success) {
  console.log(
    `[validate-cloudflare-pages] Project "${projectName}" is reachable (account ${accountId})`,
  );
  process.exit(0);
}

console.error(
  `[validate-cloudflare-pages] Project "${projectName}" not found (HTTP ${response.status})`,
);
console.error(JSON.stringify(body));

const listUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`;
const listResponse = await fetch(listUrl, {
  headers: { Authorization: `Bearer ${apiToken}` },
});
const listBody = await listResponse.json();

if (listResponse.ok && listBody.success) {
  console.error('[validate-cloudflare-pages] Available projects on this account:');
  for (const project of listBody.result ?? []) {
    console.error(`  - ${project.name}`);
  }
}

process.exit(1);
