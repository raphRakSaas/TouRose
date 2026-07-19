import {
  addDiscover,
  addFavorite,
  isFavorite,
  isVisited,
  listFavorites,
  listPendingOps,
  markVisited,
  removeFavorite,
  toggleFavorite,
  toggleVisited,
} from './local-catalog';
import { resetLocalDatabaseForTests } from '@/src/lib/local-db';

beforeEach(() => {
  const resetMock = (globalThis as { __resetTouRoseSqliteMock?: () => void })
    .__resetTouRoseSqliteMock;
  resetMock?.();
  resetLocalDatabaseForTests();
});

describe('local-catalog', () => {
  const eventItem = {
    entityType: 'event' as const,
    entityId: '55555555-5555-5555-5555-555555555501',
    slug: 'concert-test',
    title: 'Concert test',
    subtitle: 'Événement · gratuit',
  };

  it('ajoute et liste un favori', async () => {
    await addFavorite(eventItem);
    expect(await isFavorite(eventItem.entityType, eventItem.entityId)).toBe(true);
    const favorites = await listFavorites();
    expect(favorites).toHaveLength(1);
    expect(favorites[0].title).toBe('Concert test');
  });

  it('toggle favori et enqueue des ops', async () => {
    expect(await toggleFavorite(eventItem)).toBe(true);
    expect(await toggleFavorite(eventItem)).toBe(false);
    expect(await isFavorite(eventItem.entityType, eventItem.entityId)).toBe(false);
    const ops = await listPendingOps();
    expect(ops.map((op) => op.op)).toEqual(['favorite_add', 'favorite_remove']);
  });

  it('marque visité et découvre', async () => {
    await markVisited({
      entityType: 'place',
      entityId: '66666666-6666-6666-6666-666666666601',
      slug: 'jardin',
      title: 'Jardin',
    });
    expect(
      await isVisited('place', '66666666-6666-6666-6666-666666666601'),
    ).toBe(true);
    expect(await toggleVisited({
      entityType: 'place',
      entityId: '66666666-6666-6666-6666-666666666601',
      slug: 'jardin',
      title: 'Jardin',
    })).toBe(false);

    await addDiscover(eventItem);
    await removeFavorite(eventItem.entityType, eventItem.entityId, {
      slug: eventItem.slug,
      title: eventItem.title,
    });
  });
});
