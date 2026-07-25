import { View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandIcon } from '@/components/ui/BrandIcon';
import { BrandWordmark } from '@/components/ui/BrandWordmark';

type BrandLockupProps = {
  iconSize?: number;
  wordmarkHeight?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Icône pin-brique + wordmark, identité complète TouRose. */
export function BrandLockup({
  iconSize = 36,
  wordmarkHeight = 26,
  gap = 10,
  style,
  testID = 'brand-lockup',
}: BrandLockupProps) {
  return (
    <View testID={testID} style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      <BrandIcon size={iconSize} testID={`${testID}-icon`} />
      <BrandWordmark height={wordmarkHeight} testID={`${testID}-wordmark`} />
    </View>
  );
}
