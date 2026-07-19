import type { PublicPlaceRow } from '@tourose/contracts';

type PlaceType = PublicPlaceRow['place_type'];

const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  monument: 'Monument',
  museum: 'Musée',
  square: 'Place',
  park: 'Parc',
  walk: 'Balade',
  viewpoint: 'Point de vue',
  activity: 'Activité',
  cultural_venue: 'Salle',
  historical_site: 'Site historique',
  permanent_tip: 'Bon plan',
};

export function placeTypeLabel(placeType: PlaceType): string {
  return PLACE_TYPE_LABELS[placeType] ?? placeType;
}

export function formatDistanceLabel(distanceKm: number): string {
  if (distanceKm < 0.1) {
    return 'À proximité';
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
}
