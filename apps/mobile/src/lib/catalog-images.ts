import type { ImageSourcePropType } from 'react-native';

import { TOULOUSE_PHOTOS } from '@/src/assets/photos';

/** Incrémenter pour invalider le cache SQLite catalogue + React Query côté mobile. */
export const CATALOG_CACHE_GENERATION = 3;

const EDITORIAL_PLACE_PHOTOS: Partial<Record<string, ImageSourcePropType>> = {
  'place-du-capitole': TOULOUSE_PHOTOS.capitolePlace,
  'jardin-des-plantes': TOULOUSE_PHOTOS.jardinDesPlantes,
  'quais-de-la-garonne': TOULOUSE_PHOTOS.quaisGaronne,
  'prairie-des-filtres': TOULOUSE_PHOTOS.quaisGaronne,
  'pont-neuf-toulouse': TOULOUSE_PHOTOS.baladeNocturne,
  'bon-plan-coucher-soleil-saint-pierre': TOULOUSE_PHOTOS.toulouseAmoureux,
  'jardin-raymond-vi': TOULOUSE_PHOTOS.saintCyprien,
};

export function resolveEventImageSource(
  imageUrl: string | null | undefined,
): ImageSourcePropType | undefined {
  if (!imageUrl) {
    return undefined;
  }
  return { uri: imageUrl };
}

export function resolvePlaceImageSource(
  slug: string,
  imageUrl: string | null | undefined,
): ImageSourcePropType | undefined {
  if (imageUrl) {
    return { uri: imageUrl };
  }
  return EDITORIAL_PLACE_PHOTOS[slug];
}
