import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATALOG_CACHE_KEY_PREFIX, readCatalogCache, writeCatalogCache, withCatalogCache } from '@/src/lib/catalog-cache';

jest.mock('@/src/lib/local-db', () => ({
  getLocalDatabase: jest.fn(),
}));

import { getLocalDatabase } from '@/src/lib/local-db';

describe('catalog-cache', () => {
  const catalogRows = new Map<string, { payload: string; cached_at: string }>();

  beforeEach(async () => {
    catalogRows.clear();
    await AsyncStorage.clear();
    (getLocalDatabase as jest.Mock).mockResolvedValue({
      execAsync: jest.fn(async () => undefined),
      runAsync: jest.fn(async (sql: string, cacheKey: string, payload: string, cachedAt: string) => {
        if (sql.includes('INSERT INTO catalog_cache')) {
          catalogRows.set(cacheKey, { payload, cached_at: cachedAt });
        }
      }),
      getFirstAsync: jest.fn(async (sql: string, cacheKey: string) => {
        if (sql.includes('FROM catalog_cache')) {
          return catalogRows.get(cacheKey) ?? null;
        }
        return null;
      }),
    });
  });

  it('écrit puis relit le cache', async () => {
    await writeCatalogCache('catalog:events:20', [{ id: 'event-1' }]);
    const cached = await readCatalogCache<[{ id: string }]>('catalog:events:20');
    expect(cached?.data).toEqual([{ id: 'event-1' }]);
  });

  it('retourne le cache si le fetch échoue', async () => {
    const cacheKey = `${CATALOG_CACHE_KEY_PREFIX}events:10`;
    await writeCatalogCache(cacheKey, [{ id: 'cached' }]);
    const result = await withCatalogCache('events:10', async () => {
      throw new Error('offline');
    });
    expect(result.fromCache).toBe(true);
    expect(result.data).toEqual([{ id: 'cached' }]);
  });
});
