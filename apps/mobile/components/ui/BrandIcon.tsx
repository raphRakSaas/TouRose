import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { BRAND_ASSETS } from '@/src/assets/brand';

type BrandIconProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

export function BrandIcon({ size = 32, style, testID = 'brand-icon' }: BrandIconProps) {
  return (
    <Image
      testID={testID}
      accessibilityLabel="TouRose"
      source={BRAND_ASSETS.icon}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );
}
