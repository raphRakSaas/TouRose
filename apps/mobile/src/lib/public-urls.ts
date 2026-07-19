import Constants from 'expo-constants';

const DEFAULT_WEBSITE_ORIGIN = 'http://127.0.0.1:4321';

function websiteOrigin(): string {
  const extra = Constants.expoConfig?.extra as { websiteOrigin?: string } | undefined;
  const fromExtra = extra?.websiteOrigin?.trim();
  const fromEnv = process.env.EXPO_PUBLIC_WEBSITE_ORIGIN?.trim();
  return fromEnv || fromExtra || DEFAULT_WEBSITE_ORIGIN;
}

export function buildPublicCatalogUrl(
  entityType: 'event' | 'place',
  slug: string,
): string {
  const origin = websiteOrigin().replace(/\/$/, '');
  if (entityType === 'event') {
    return `${origin}/catalogue/evenements/${slug}`;
  }
  return `${origin}/catalogue/lieux/${slug}`;
}
