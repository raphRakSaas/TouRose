import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { BRAND_ASSETS, BRAND_WORDMARK_ASPECT_RATIO } from '@/src/assets/brand';

type BrandWordmarkProps = {
  height?: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

export function BrandWordmark({
  height = 26,
  style,
  testID = 'brand-wordmark',
}: BrandWordmarkProps) {
  return (
    <Image
      testID={testID}
      accessibilityLabel="TouRose"
      source={BRAND_ASSETS.wordmark}
      resizeMode="contain"
      style={[{ height, width: height * BRAND_WORDMARK_ASPECT_RATIO }, style]}
    />
  );
}
