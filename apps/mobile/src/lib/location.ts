import * as Location from 'expo-location';

export type LocationAccessResult = 'granted' | 'denied' | 'unavailable';

export type UserCoordinates = {
  latitude: number;
  longitude: number;
};

const TOULOUSE_FALLBACK: UserCoordinates = {
  latitude: 43.6045,
  longitude: 1.444,
};

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

/**
 * Position actuelle si permission déjà accordée, sinon centre Toulouse.
 * N’affiche pas de prompt si l’accès a déjà été refusé.
 */
export async function getUserCoordinatesOrToulouse(): Promise<UserCoordinates> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      return TOULOUSE_FALLBACK;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return TOULOUSE_FALLBACK;
  }
}
