import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'tourose-local.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS local_favorites (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'place')),
  entity_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  payload TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS local_discover (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'place')),
  entity_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  payload TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS local_visited (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'place')),
  entity_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  payload TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS local_ops_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  op TEXT NOT NULL CHECK (op IN ('favorite_add', 'favorite_remove', 'visit', 'unvisit', 'discover_add', 'discover_remove')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'place')),
  entity_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT,
  created_at TEXT NOT NULL
);
`;

export async function getLocalDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await database.execAsync(SCHEMA_SQL);
      return database;
    })();
  }
  return databasePromise;
}

/** Test helper — reset the singleton so a fresh DB can be opened. */
export function resetLocalDatabaseForTests(): void {
  databasePromise = null;
}
