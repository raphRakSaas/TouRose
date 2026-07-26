import type { PublicPlaceRow } from '@tourose/contracts';

/** Photos locales (Wikimedia Commons) — voir apps/mobile/assets/images/photos/CREDITS.md */
export const LOCAL_TOULOUSE_PHOTOS = {
  hero: '/catalog/photos/toulouse-hero.jpg',
  capitole: '/catalog/photos/capitole-place.jpg',
  quais: '/catalog/photos/quais-garonne.jpg',
  jardin: '/catalog/photos/jardin-des-plantes.jpg',
  sunset: '/catalog/photos/toulouse-amoureux.jpg',
  pontNeuf: '/catalog/photos/balade-nocturne.jpg',
  garonne: '/catalog/photos/saint-cyprien.jpg',
} as const;

const COVER_BY_SLUG: Partial<Record<string, string>> = {
  'place-du-capitole': LOCAL_TOULOUSE_PHOTOS.capitole,
  'jardin-des-plantes': LOCAL_TOULOUSE_PHOTOS.jardin,
  'quais-de-la-garonne': LOCAL_TOULOUSE_PHOTOS.quais,
  'prairie-des-filtres': LOCAL_TOULOUSE_PHOTOS.quais,
  'pont-neuf-toulouse': LOCAL_TOULOUSE_PHOTOS.pontNeuf,
  'bon-plan-coucher-soleil-saint-pierre': LOCAL_TOULOUSE_PHOTOS.sunset,
  'jardin-raymond-vi': LOCAL_TOULOUSE_PHOTOS.garonne,
  'rue-du-taur-flanerie': LOCAL_TOULOUSE_PHOTOS.capitole,
  'marche-victor-hugo': LOCAL_TOULOUSE_PHOTOS.capitole,
  'place-saint-georges': LOCAL_TOULOUSE_PHOTOS.capitole,
};

const COVER_BY_PLACE_TYPE: Partial<Record<PublicPlaceRow['place_type'], string>> = {
  monument: LOCAL_TOULOUSE_PHOTOS.capitole,
  museum: LOCAL_TOULOUSE_PHOTOS.hero,
  square: LOCAL_TOULOUSE_PHOTOS.capitole,
  park: LOCAL_TOULOUSE_PHOTOS.jardin,
  walk: LOCAL_TOULOUSE_PHOTOS.quais,
  viewpoint: LOCAL_TOULOUSE_PHOTOS.sunset,
  activity: LOCAL_TOULOUSE_PHOTOS.hero,
  historical_site: LOCAL_TOULOUSE_PHOTOS.capitole,
  permanent_tip: LOCAL_TOULOUSE_PHOTOS.quais,
  cultural_venue: LOCAL_TOULOUSE_PHOTOS.hero,
};

export function resolvePlaceCoverImage(
  placeRow: Pick<PublicPlaceRow, 'slug' | 'place_type' | 'image_url'>,
): string {
  if (placeRow.image_url) {
    return placeRow.image_url;
  }
  return (
    COVER_BY_SLUG[placeRow.slug] ??
    COVER_BY_PLACE_TYPE[placeRow.place_type] ??
    LOCAL_TOULOUSE_PHOTOS.hero
  );
}
