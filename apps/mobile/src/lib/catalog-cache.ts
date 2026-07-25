import { getLocalDatabase } from '@/src/lib/local-db';
import { CATALOG_CACHE_GENERATION } from '@/src/lib/catalog-images';

export const CATALOG_CACHE_KEY_PREFIX = `catalog:g${CATALOG_CACHE_GENERATION}:`;

export type CatalogCacheEntry<T> = {
  data: T;
  cachedAt: string;
};

let schemaReady = false;

async function ensureCatalogCacheSchema(): Promise<void> {
  if (schemaReady) {
    return;
  }
  const database = await getLocalDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS catalog_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );
  `);
  schemaReady = true;
}

export async function readCatalogCache<T>(cacheKey: string): Promise<CatalogCacheEntry<T> | null> {
  await ensureCatalogCacheSchema();
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{ payload: string; cached_at: string }>(
    'SELECT payload, cached_at FROM catalog_cache WHERE cache_key = ?',
    cacheKey,
  );
  if (!row) {
    return null;
  }
  try {
    return {
      data: JSON.parse(row.payload) as T,
      cachedAt: row.cached_at,
    };
  } catch {
    return null;
  }
}

export async function writeCatalogCache<T>(cacheKey: string, data: T): Promise<string> {
  await ensureCatalogCacheSchema();
  const database = await getLocalDatabase();
  const cachedAt = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO catalog_cache (cache_key, payload, cached_at)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       payload = excluded.payload,
       cached_at = excluded.cached_at`,
    cacheKey,
    JSON.stringify(data),
    cachedAt,
  );
  return cachedAt;
}

export async function purgeLegacyCatalogCache(): Promise<void> {
  await ensureCatalogCacheSchema();
  const database = await getLocalDatabase();
  await database.runAsync(`DELETE FROM catalog_cache WHERE cache_key NOT LIKE ?`, [
    `${CATALOG_CACHE_KEY_PREFIX}%`,
  ]);
}

export async function withCatalogCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean; cachedAt: string | null }> {
  const versionedKey = cacheKey.startsWith(CATALOG_CACHE_KEY_PREFIX)
    ? cacheKey
    : `${CATALOG_CACHE_KEY_PREFIX}${cacheKey}`;
  try {
    const data = await fetcher();
    const cachedAt = await writeCatalogCache(versionedKey, data);
    return { data, fromCache: false, cachedAt };
  } catch (error) {
    const cached = await readCatalogCache<T>(versionedKey);
    if (cached) {
      return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
    }
    throw error;
  }
}
