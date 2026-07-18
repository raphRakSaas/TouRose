import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDE_TODAY_KEY = 'tourose.stackedPicks.hideDate';

/** Clé jour locale YYYY-MM-DD. */
export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function isStackedPicksHiddenForToday(now = new Date()): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(HIDE_TODAY_KEY);
    return stored === localDayKey(now);
  } catch {
    return false;
  }
}

export async function hideStackedPicksForToday(now = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(HIDE_TODAY_KEY, localDayKey(now));
  } catch {
    // Ignore storage errors — le modal pourra réapparaître.
  }
}

/** Exposé pour les tests. */
export const STACKED_PICKS_HIDE_KEY = HIDE_TODAY_KEY;
