import { forwardRef } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION_PRESS_IN, MOTION_PRESS_OUT, useReducedMotion } from '@/src/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & {
  scaleTo?: number;
};

export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { scaleTo = 0.98, children, onPressIn, onPressOut, style, ...pressableProps },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      ref={ref}
      {...pressableProps}
      onPressIn={(event) => {
        if (!reduceMotion) {
          scale.value = withTiming(scaleTo, MOTION_PRESS_IN);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (!reduceMotion) {
          scale.value = withTiming(1, MOTION_PRESS_OUT);
        }
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
});
