import { Alert, Linking, Platform } from 'react-native';

export type DirectionsTarget = {
  latitude: number;
  longitude: number;
  label?: string;
};

export function appleMapsUrl(target: DirectionsTarget): string {
  const query = target.label ? `&q=${encodeURIComponent(target.label)}` : '';
  return `http://maps.apple.com/?daddr=${target.latitude},${target.longitude}${query}`;
}

export function googleMapsUrl(target: DirectionsTarget): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
}

export function wazeUrl(target: DirectionsTarget): string {
  return `https://waze.com/ul?ll=${target.latitude},${target.longitude}&navigate=yes`;
}

/** Feuille native de choix d'app de navigation (Plans / Google Maps / Waze). */
export function openDirections(target: DirectionsTarget): void {
  const options: { label: string; url: string }[] = [
    ...(Platform.OS === 'ios' ? [{ label: 'Plans', url: appleMapsUrl(target) }] : []),
    { label: 'Google Maps', url: googleMapsUrl(target) },
    { label: 'Waze', url: wazeUrl(target) },
  ];

  Alert.alert(
    'Y aller',
    target.label ?? 'Choisis ton app de navigation',
    [
      ...options.map((option) => ({
        text: option.label,
        onPress: () => void Linking.openURL(option.url),
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ],
    { cancelable: true },
  );
}
