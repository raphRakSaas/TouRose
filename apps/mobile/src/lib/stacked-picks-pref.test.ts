import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  hideStackedPicksForToday,
  isStackedPicksHiddenForToday,
  localDayKey,
  STACKED_PICKS_HIDE_KEY,
} from './stacked-picks-pref';

describe('stacked-picks-pref', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('formate la clé jour locale', () => {
    expect(localDayKey(new Date('2026-07-18T15:00:00'))).toBe('2026-07-18');
  });

  it('ne masque pas par défaut', async () => {
    expect(await isStackedPicksHiddenForToday(new Date('2026-07-18T12:00:00'))).toBe(false);
  });

  it('masque pour aujourd’hui après hideStackedPicksForToday', async () => {
    const now = new Date('2026-07-18T12:00:00');
    await hideStackedPicksForToday(now);
    expect(await AsyncStorage.getItem(STACKED_PICKS_HIDE_KEY)).toBe('2026-07-18');
    expect(await isStackedPicksHiddenForToday(now)).toBe(true);
    expect(await isStackedPicksHiddenForToday(new Date('2026-07-19T12:00:00'))).toBe(false);
  });
});
