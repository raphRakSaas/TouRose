import { FontAwesome } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION_PRESS_IN, MOTION_PRESS_OUT, useReducedMotion } from '@/src/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type FavoriteActionButtonProps = {
  isFavorite: boolean;
  onPress: () => void;
  testID?: string;
};

export function FavoriteActionButton({ isFavorite, onPress, testID }: FavoriteActionButtonProps) {
  const reduceMotion = useReducedMotion();
  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) {
          buttonScale.value = withTiming(0.98, MOTION_PRESS_IN);
        }
      }}
      onPressOut={() => {
        if (!reduceMotion) {
          buttonScale.value = withTiming(1, MOTION_PRESS_OUT);
        }
      }}
      className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-brick-500 py-2.5"
      style={[buttonAnimatedStyle, { backgroundColor: isFavorite ? '#C45C3E' : 'transparent' }]}
    >
      <FontAwesome
        name={isFavorite ? 'heart' : 'heart-o'}
        size={14}
        color={isFavorite ? '#FFFFFF' : '#A94A30'}
      />
      <Text
        className={`text-[13px] font-body-semibold ${isFavorite ? 'text-white' : 'text-brick-700'}`}
      >
        Favori
      </Text>
    </AnimatedPressable>
  );
}
