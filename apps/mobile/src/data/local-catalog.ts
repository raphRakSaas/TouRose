import { getLocalDatabase } from '@/src/lib/local-db';

export type LocalEntityType = 'event' | 'place';

export type LocalCatalogItem = {
  entityType: LocalEntityType;
  entityId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  payload: Record<string, unknown> | null;
  updatedAt: string;
};

export type LocalOp =
  | 'favorite_add'
  | 'favorite_remove'
  | 'visit'
  | 'unvisit'
  | 'discover_add'
  | 'discover_remove';

type ListTable = 'local_favorites' | 'local_discover' | 'local_visited';

type CatalogItemInput = {
  entityType: LocalEntityType;
  entityId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  payload?: Record<string, unknown> | null;
};

function mapRow(row: {
  entity_type: string;
  entity_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  payload: string | null;
  updated_at: string;
}): LocalCatalogItem {
  let payload: Record<string, unknown> | null = null;
  if (row.payload) {
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }
  return {
    entityType: row.entity_type as LocalEntityType,
    entityId: row.entity_id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    payload,
    updatedAt: row.updated_at,
  };
}

async function listFromTable(tableName: ListTable): Promise<LocalCatalogItem[]> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{
    entity_type: string;
    entity_id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    payload: string | null;
    updated_at: string;
  }>(`SELECT * FROM ${tableName} ORDER BY updated_at DESC`);
  return rows.map(mapRow);
}

async function enqueueOp(
  op: LocalOp,
  item: CatalogItemInput,
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `INSERT INTO local_ops_queue (op, entity_type, entity_id, slug, title, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    op,
    item.entityType,
    item.entityId,
    item.slug,
    item.title,
    item.payload ? JSON.stringify(item.payload) : null,
    new Date().toISOString(),
  );
}

async function upsertIntoTable(tableName: ListTable, item: CatalogItemInput): Promise<void> {
  const database = await getLocalDatabase();
  const updatedAt = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO ${tableName} (entity_type, entity_id, slug, title, subtitle, payload, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       slug = excluded.slug,
       title = excluded.title,
       subtitle = excluded.subtitle,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    item.entityType,
    item.entityId,
    item.slug,
    item.title,
    item.subtitle ?? null,
    item.payload ? JSON.stringify(item.payload) : null,
    updatedAt,
  );
}

async function deleteFromTable(
  tableName: ListTable,
  entityType: LocalEntityType,
  entityId: string,
): Promise<void> {
  const database = await getLocalDatabase();
  await database.runAsync(
    `DELETE FROM ${tableName} WHERE entity_type = ? AND entity_id = ?`,
    entityType,
    entityId,
  );
}

async function existsInTable(
  tableName: ListTable,
  entityType: LocalEntityType,
  entityId: string,
): Promise<boolean> {
  const database = await getLocalDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${tableName} WHERE entity_type = ? AND entity_id = ?`,
    entityType,
    entityId,
  );
  return (row?.count ?? 0) > 0;
}

export async function listFavorites(): Promise<LocalCatalogItem[]> {
  return listFromTable('local_favorites');
}

export async function listDiscover(): Promise<LocalCatalogItem[]> {
  return listFromTable('local_discover');
}

export async function listVisited(): Promise<LocalCatalogItem[]> {
  return listFromTable('local_visited');
}

export async function isFavorite(
  entityType: LocalEntityType,
  entityId: string,
): Promise<boolean> {
  return existsInTable('local_favorites', entityType, entityId);
}

export async function isVisited(
  entityType: LocalEntityType,
  entityId: string,
): Promise<boolean> {
  return existsInTable('local_visited', entityType, entityId);
}

export async function isDiscover(
  entityType: LocalEntityType,
  entityId: string,
): Promise<boolean> {
  return existsInTable('local_discover', entityType, entityId);
}

export async function addFavorite(item: CatalogItemInput): Promise<void> {
  await upsertIntoTable('local_favorites', item);
  await enqueueOp('favorite_add', item);
}

export async function removeFavorite(
  entityType: LocalEntityType,
  entityId: string,
  meta: Pick<CatalogItemInput, 'slug' | 'title'>,
): Promise<void> {
  await deleteFromTable('local_favorites', entityType, entityId);
  await enqueueOp('favorite_remove', {
    entityType,
    entityId,
    slug: meta.slug,
    title: meta.title,
  });
}

export async function toggleFavorite(item: CatalogItemInput): Promise<boolean> {
  const alreadyFavorite = await isFavorite(item.entityType, item.entityId);
  if (alreadyFavorite) {
    await removeFavorite(item.entityType, item.entityId, {
      slug: item.slug,
      title: item.title,
    });
    return false;
  }
  await addFavorite(item);
  return true;
}

export async function markVisited(item: CatalogItemInput): Promise<void> {
  await upsertIntoTable('local_visited', item);
  await enqueueOp('visit', item);
}

export async function unmarkVisited(
  entityType: LocalEntityType,
  entityId: string,
  meta: Pick<CatalogItemInput, 'slug' | 'title'>,
): Promise<void> {
  await deleteFromTable('local_visited', entityType, entityId);
  await enqueueOp('unvisit', {
    entityType,
    entityId,
    slug: meta.slug,
    title: meta.title,
  });
}

export async function toggleVisited(item: CatalogItemInput): Promise<boolean> {
  const alreadyVisited = await isVisited(item.entityType, item.entityId);
  if (alreadyVisited) {
    await unmarkVisited(item.entityType, item.entityId, {
      slug: item.slug,
      title: item.title,
    });
    return false;
  }
  await markVisited(item);
  return true;
}

export async function addDiscover(item: CatalogItemInput): Promise<void> {
  await upsertIntoTable('local_discover', item);
  await enqueueOp('discover_add', item);
}

export async function removeDiscover(
  entityType: LocalEntityType,
  entityId: string,
  meta: Pick<CatalogItemInput, 'slug' | 'title'>,
): Promise<void> {
  await deleteFromTable('local_discover', entityType, entityId);
  await enqueueOp('discover_remove', {
    entityType,
    entityId,
    slug: meta.slug,
    title: meta.title,
  });
}

export async function listPendingOps(): Promise<
  Array<{
    id: number;
    op: LocalOp;
    entityType: LocalEntityType;
    entityId: string;
    slug: string;
    title: string;
  }>
> {
  const database = await getLocalDatabase();
  const rows = await database.getAllAsync<{
    id: number;
    op: string;
    entity_type: string;
    entity_id: string;
    slug: string;
    title: string;
  }>('SELECT id, op, entity_type, entity_id, slug, title FROM local_ops_queue ORDER BY id ASC');
  return rows.map((row) => ({
    id: row.id,
    op: row.op as LocalOp,
    entityType: row.entity_type as LocalEntityType,
    entityId: row.entity_id,
    slug: row.slug,
    title: row.title,
  }));
}

export function hrefForLocalItem(item: LocalCatalogItem): string {
  return item.entityType === 'event' ? `/event/${item.slug}` : `/place/${item.slug}`;
}
