import type { PublicPlaceRow } from '@tourose/contracts';
import placeCoverManifest from './place-cover-manifest.json';

/** Photos locales génériques Toulouse — voir public/catalog/photos/CREDITS.md */
export const LOCAL_TOULOUSE_PHOTOS = {
  hero: '/catalog/photos/toulouse-hero.jpg',
  capitole: '/catalog/photos/capitole-place.jpg',
  quais: '/catalog/photos/quais-garonne.jpg',
  jardin: '/catalog/photos/jardin-des-plantes.jpg',
  sunset: '/catalog/photos/toulouse-amoureux.jpg',
  pontNeuf: '/catalog/photos/balade-nocturne.jpg',
  garonne: '/catalog/photos/saint-cyprien.jpg',
} as const;

const LOCAL_PLACE_COVER_PREFIX = '/catalog/photos/places';
const LOCAL_PLACE_COVER_SLUGS = new Set(placeCoverManifest.slugs);

const COVER_BY_PLACE_TYPE: Partial<Record<PublicPlaceRow['place_type'], string>> = {
  monument: LOCAL_TOULOUSE_PHOTOS.capitole,
  museum: LOCAL_TOULOUSE_PHOTOS.hero,
  square: LOCAL_TOULOUSE_PHOTOS.hero,
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
  if (LOCAL_PLACE_COVER_SLUGS.has(placeRow.slug)) {
    return `${LOCAL_PLACE_COVER_PREFIX}/${placeRow.slug}.jpg`;
  }
  return COVER_BY_PLACE_TYPE[placeRow.place_type] ?? LOCAL_TOULOUSE_PHOTOS.hero;
}
