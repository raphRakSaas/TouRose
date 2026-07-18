import * as Location from 'expo-location';

export type LocationAccessResult = 'granted' | 'denied' | 'unavailable';

/**
 * Demande la permission de localisation en premier plan.
 * Ne lance jamais d'exception : l'onboarding doit continuer quoi qu'il arrive.
 */
export async function requestLocationAccess(): Promise<LocationAccessResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
