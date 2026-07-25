import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';

import { enterFadeInUp, useReducedMotion } from '@/src/lib/motion';

type AnimatedListItemProps = {
  index: number;
  children: ReactNode;
};

export function AnimatedListItem({ index, children }: AnimatedListItemProps) {
  const reduceMotion = useReducedMotion();

  return <Animated.View entering={enterFadeInUp(index, reduceMotion)}>{children}</Animated.View>;
}
