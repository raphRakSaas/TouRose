import { useEffect } from 'react';
import { type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/src/lib/motion';

type SkeletonBlockProps = ViewProps & {
  className?: string;
};

export function SkeletonBlock({ className, style, ...viewProps }: SkeletonBlockProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.7 : opacity.value,
  }));

  return <Animated.View className={className} style={[style, animatedStyle]} {...viewProps} />;
}
