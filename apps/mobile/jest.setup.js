jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest setup
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

(() => {
  /** In-memory expo-sqlite async API for Jest. */
  const listTables = {
    local_favorites: new Map(),
    local_discover: new Map(),
    local_visited: new Map(),
  };
  const opsQueue = [];
  let nextOpId = 1;

  function rowKey(entityType, entityId) {
    return `${entityType}::${entityId}`;
  }

  function resetMemory() {
    listTables.local_favorites.clear();
    listTables.local_discover.clear();
    listTables.local_visited.clear();
    opsQueue.length = 0;
    nextOpId = 1;
  }

  const mockDatabase = {
    async execAsync() {},
    async runAsync(sql, ...params) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (normalized.startsWith('INSERT INTO local_ops_queue')) {
        opsQueue.push({
          id: nextOpId,
          op: String(params[0]),
          entity_type: String(params[1]),
          entity_id: String(params[2]),
          slug: String(params[3]),
          title: String(params[4]),
          payload: params[5] ?? null,
          created_at: String(params[6]),
        });
        nextOpId += 1;
        return;
      }
      const upsertMatch = normalized.match(
        /^INSERT INTO (local_favorites|local_discover|local_visited)/,
      );
      if (upsertMatch) {
        const tableName = upsertMatch[1];
        listTables[tableName].set(rowKey(String(params[0]), String(params[1])), {
          entity_type: String(params[0]),
          entity_id: String(params[1]),
          slug: String(params[2]),
          title: String(params[3]),
          subtitle: params[4] ?? null,
          payload: params[5] ?? null,
          updated_at: String(params[6]),
        });
        return;
      }
      const deleteMatch = normalized.match(
        /^DELETE FROM (local_favorites|local_discover|local_visited)/,
      );
      if (deleteMatch) {
        listTables[deleteMatch[1]].delete(rowKey(String(params[0]), String(params[1])));
      }
    },
    async getAllAsync(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (normalized.includes('FROM local_ops_queue')) {
        return [...opsQueue];
      }
      const listMatch = normalized.match(/FROM (local_favorites|local_discover|local_visited)/);
      if (listMatch) {
        return [...listTables[listMatch[1]].values()].sort((first, second) =>
          second.updated_at.localeCompare(first.updated_at),
        );
      }
      return [];
    },
    async getFirstAsync(sql, ...params) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      const listMatch = normalized.match(/FROM (local_favorites|local_discover|local_visited)/);
      if (listMatch && normalized.includes('COUNT(*)')) {
        const exists = listTables[listMatch[1]].has(
          rowKey(String(params[0]), String(params[1])),
        );
        return { count: exists ? 1 : 0 };
      }
      return null;
    },
  };

  global.__resetTouRoseSqliteMock = resetMemory;

  jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(async () => mockDatabase),
  }));
})();

jest.mock('expo-calendar', () => ({
  EntityTypes: { EVENT: 'event' },
  getCalendarPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestCalendarPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getDefaultCalendarAsync: jest.fn(async () => ({ id: 'cal-1' })),
  getCalendarsAsync: jest.fn(async () => [
    { id: 'cal-1', allowsModifications: true, accessLevel: 'owner' },
  ]),
  createEventAsync: jest.fn(async () => 'event-cal-1'),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'dismiss' })),
}));
