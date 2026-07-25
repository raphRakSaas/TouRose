import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Easing,
  FadeIn,
  FadeInUp,
  SlideInUp,
  type BaseAnimationBuilder,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * Courbes proches des patterns iOS / Material — décélération en fin de mouvement,
 * sans rebond (les utilisateurs s’y attendent pour sheets, modales et listes).
 */
export const MOTION_EASING = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
} as const;

export const MOTION = {
  fast: 180,
  normal: 260,
  sheet: 320,
  slow: 360,
  stagger: 45,
  maxStaggerItems: 6,
  pressIn: 90,
  pressOut: 130,
} as const;

export const MOTION_PRESS_IN: WithTimingConfig = {
  duration: MOTION.pressIn,
  easing: MOTION_EASING.decelerate,
};

export const MOTION_PRESS_OUT: WithTimingConfig = {
  duration: MOTION.pressOut,
  easing: MOTION_EASING.decelerate,
};

export function staggerDelay(index: number): number {
  return Math.min(index, MOTION.maxStaggerItems) * MOTION.stagger;
}

export function useReducedMotion(): boolean {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );
    return () => subscription.remove();
  }, []);

  return reduceMotionEnabled;
}

/** Entrée discrète pour listes et blocs de contenu. */
export function enterFadeInUp(index = 0, reduceMotion = false): BaseAnimationBuilder | undefined {
  if (reduceMotion) {
    return undefined;
  }
  return FadeInUp.duration(MOTION.normal)
    .delay(staggerDelay(index))
    .easing(MOTION_EASING.decelerate);
}

export function enterFadeIn(index = 0, reduceMotion = false): BaseAnimationBuilder | undefined {
  if (reduceMotion) {
    return undefined;
  }
  return FadeIn.duration(MOTION.fast).delay(staggerDelay(index)).easing(MOTION_EASING.decelerate);
}

/** Bottom sheet : monte depuis le bas et s’arrête net (pas de spring). */
export function enterSlideUpSheet(reduceMotion = false): BaseAnimationBuilder | undefined {
  if (reduceMotion) {
    return undefined;
  }
  return SlideInUp.duration(MOTION.sheet).easing(MOTION_EASING.decelerate);
}

/** Dialogue centré : fondu simple, comme une alerte native. */
export function enterCenterDialog(reduceMotion = false): BaseAnimationBuilder | undefined {
  if (reduceMotion) {
    return undefined;
  }
  return FadeIn.duration(MOTION.fast).easing(MOTION_EASING.decelerate);
}

export function enterFadeInSlow(reduceMotion = false): BaseAnimationBuilder | undefined {
  if (reduceMotion) {
    return undefined;
  }
  return FadeIn.duration(MOTION.slow).easing(MOTION_EASING.decelerate);
}
