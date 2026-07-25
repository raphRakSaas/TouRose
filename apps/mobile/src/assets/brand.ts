/* eslint-disable @typescript-eslint/no-require-imports -- Metro charge les assets statiques via require() */
import type { ImageSourcePropType } from 'react-native';

export const BRAND_ASSETS = {
  icon: require('../../assets/images/brand/logo-icon.png'),
  wordmark: require('../../assets/images/brand/logo-wordmark.png'),
} satisfies Record<string, ImageSourcePropType>;

/** Wordmark recadré : 791×208 px à l’export. */
export const BRAND_WORDMARK_ASPECT_RATIO = 791 / 208;
