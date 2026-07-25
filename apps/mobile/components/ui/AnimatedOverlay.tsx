import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { enterCenterDialog, enterFadeIn, enterSlideUpSheet, MOTION, useReducedMotion } from '@/src/lib/motion';

type AnimatedOverlayProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: 'bottom-sheet' | 'center-dialog';
  sheetClassName?: string;
  backdropClassName?: string;
  backdropAccessibilityLabel?: string;
};

export function AnimatedOverlay({
  visible,
  onClose,
  children,
  variant = 'bottom-sheet',
  sheetClassName,
  backdropClassName = 'bg-ink-800/35',
  backdropAccessibilityLabel = 'Fermer',
}: AnimatedOverlayProps) {
  const reduceMotion = useReducedMotion();

  if (!visible) {
    return null;
  }

  const sheetEntering =
    variant === 'bottom-sheet'
      ? enterSlideUpSheet(reduceMotion)
      : enterCenterDialog(reduceMotion);

  return (
    <View className="absolute inset-0 z-40">
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(MOTION.fast)}
        className="absolute inset-0"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backdropAccessibilityLabel}
          className={`absolute inset-0 ${backdropClassName}`}
          onPress={onClose}
        />
      </Animated.View>

      {variant === 'bottom-sheet' ? (
        <Animated.View entering={sheetEntering} className={sheetClassName}>
          {children}
        </Animated.View>
      ) : (
        <View className="absolute inset-0 items-center justify-center px-7" pointerEvents="box-none">
          <Animated.View entering={sheetEntering} className={sheetClassName}>
            {children}
          </Animated.View>
        </View>
      )}
    </View>
  );
}
