/* eslint-disable @typescript-eslint/no-require-imports -- Metro charge les assets statiques via require() */
import type { ImageSourcePropType } from 'react-native';

/**
 * Photos libres de droit de Toulouse (Wikimedia Commons).
 * Crédits et licences : assets/images/photos/CREDITS.md
 */
export const TOULOUSE_PHOTOS = {
  hero: require('../../assets/images/photos/toulouse-hero.jpg'),
  quaisGaronne: require('../../assets/images/photos/quais-garonne.jpg'),
  jardinDesPlantes: require('../../assets/images/photos/jardin-des-plantes.jpg'),
  saintCyprien: require('../../assets/images/photos/saint-cyprien.jpg'),
  toulouseAmoureux: require('../../assets/images/photos/toulouse-amoureux.jpg'),
  baladeNocturne: require('../../assets/images/photos/balade-nocturne.jpg'),
  capitolePlace: require('../../assets/images/photos/capitole-place.jpg'),
} satisfies Record<string, ImageSourcePropType>;

export type ToulousePhotoKey = keyof typeof TOULOUSE_PHOTOS;
