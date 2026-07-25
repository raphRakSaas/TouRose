import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { MOTION_EASING, useReducedMotion } from '@/src/lib/motion';

const BRICK_COLOR = '#C45C3E';
const BRICK_HIGHLIGHT = '#D47152';

type SupportThankYouProps = {
  onContinuePress: () => void;
};

function AnimatedBrick({
  brickIndex,
  offsetX,
  reduceMotion,
}: {
  brickIndex: number;
  offsetX: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 28);
  const scale = useSharedValue(reduceMotion ? 1 : 0.9);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const delay = 180 + brickIndex * 140;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: MOTION_EASING.decelerate }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 460, easing: MOTION_EASING.decelerate }),
    );
    scale.value = withDelay(
      delay + 220,
      withSequence(
        withTiming(1.05, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 140, easing: MOTION_EASING.decelerate }),
      ),
    );
  }, [brickIndex, opacity, reduceMotion, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          width: 62,
          height: 20,
          marginBottom: 5,
          marginLeft: offsetX,
          borderRadius: 5,
          backgroundColor: brickIndex % 2 === 0 ? BRICK_COLOR : BRICK_HIGHLIGHT,
          shadowColor: '#6B2F22',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 3,
          elevation: 2,
        },
      ]}
    />
  );
}

export function SupportThankYou({ onContinuePress }: SupportThankYouProps) {
  const reduceMotion = useReducedMotion();
  const badgeScale = useSharedValue(reduceMotion ? 1 : 0.6);
  const badgeOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    badgeOpacity.value = withDelay(
      720,
      withTiming(1, { duration: 360, easing: MOTION_EASING.decelerate }),
    );
    badgeScale.value = withDelay(
      720,
      withSequence(
        withTiming(1.08, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180, easing: MOTION_EASING.decelerate }),
      ),
    );
  }, [badgeOpacity, badgeScale, reduceMotion]);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <LinearGradient
      colors={['#F8E8E0', '#FBF8F4', '#FBF8F4']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.content}>
        <View
          testID="support-thank-you-animation"
          style={styles.animationBlock}
          accessibilityLabel="Animation de remerciement"
        >
          <AnimatedBrick brickIndex={0} offsetX={0} reduceMotion={reduceMotion} />
          <AnimatedBrick brickIndex={1} offsetX={14} reduceMotion={reduceMotion} />
          <AnimatedBrick brickIndex={2} offsetX={0} reduceMotion={reduceMotion} />

          <Animated.View style={[badgeAnimatedStyle, styles.badge]}>
            <FontAwesome name="heart" size={28} color="#FBF1EC" />
          </Animated.View>
        </View>

        <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(900).duration(420)}>
          <Text style={styles.title}>Merci, sincèrement</Text>
        </Animated.View>

        <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(1020).duration(420)}>
          <Text style={styles.subtitle}>Ta brique rose rejoint le mur de Toulouse.</Text>
        </Animated.View>

        <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(1140).duration(400)}>
          <Text style={styles.body}>
            On continue à construire TouRose avec le même soin — chaleureusement, depuis la ville
            rose.
          </Text>
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInUp.delay(1260).duration(380)}
          style={styles.buttonWrap}
        >
          <PrimaryButton label="Retour à Pour moi" onPress={onContinuePress} />
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  animationBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    marginTop: 20,
    height: 64,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#C45C3E',
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    lineHeight: 34,
    color: '#8B3D2E',
  },
  subtitle: {
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'SourceSans3_600SemiBold',
    fontSize: 16,
    lineHeight: 26,
    color: '#1F1C19',
  },
  body: {
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'SourceSans3_400Regular',
    fontSize: 14,
    lineHeight: 24,
    color: '#6B6560',
  },
  buttonWrap: {
    width: '100%',
  },
});
