const TOULOUSE_CENTER = {
  latitude: 43.6045,
  longitude: 1.444,
} as const;

/** Haversine distance in kilometers between two WGS84 points. */
export function distanceInKilometers(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function distanceFromToulouseCenter(latitude: number, longitude: number): number {
  return distanceInKilometers(
    TOULOUSE_CENTER.latitude,
    TOULOUSE_CENTER.longitude,
    latitude,
    longitude,
  );
}

export function formatRelativeDayLabel(isoDate: string, now = new Date()): string {
  const target = new Date(isoDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const dayDelta = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (dayDelta === 0) return "Aujourd'hui";
  if (dayDelta === 1) return 'Demain';
  if (dayDelta === -1) return 'Hier';
  return target.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export { TOULOUSE_CENTER };
