import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCompactCard } from '@/components/ui/EventCompactCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TOULOUSE_PHOTOS } from '@/src/assets/photos';
import type { FeedItem } from '@/src/domain/today-feed';
import { enterFadeIn, MOTION, useReducedMotion } from '@/src/lib/motion';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(280, SCREEN_WIDTH - 64);

const PICK_PHOTOS = [
  TOULOUSE_PHOTOS.quaisGaronne,
  TOULOUSE_PHOTOS.jardinDesPlantes,
  TOULOUSE_PHOTOS.saintCyprien,
] as const;

const STACK_ROTATIONS = [-4, 2, -2] as const;

type StackedPicksModalProps = {
  picks: FeedItem[];
  visible: boolean;
  onClose: () => void;
  onHideForToday: () => void;
};

export function StackedPicksModal({
  picks,
  visible,
  onClose,
  onHideForToday,
}: StackedPicksModalProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  if (!visible || picks.length === 0) {
    return null;
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }

  function openPick(pickHref: string): void {
    onClose();
    router.push(pickHref as never);
  }

  return (
    <View className="absolute inset-0 z-50" testID="stacked-picks-modal">
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(MOTION.fast)}
        className="absolute inset-0"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le fond"
          className="absolute inset-0 bg-ink-800/55"
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        entering={enterFadeIn(0, reduceMotion)}
        className="absolute bottom-0 left-0 right-0 top-0 justify-center"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        pointerEvents="box-none"
      >
        <Animated.Text
          entering={enterFadeIn(0, reduceMotion)}
          className="mb-2 px-6 text-center font-display text-[24px] text-white"
        >
          Nos 3 idées du moment
        </Animated.Text>
        <Animated.Text
          entering={enterFadeIn(1, reduceMotion)}
          className="mb-6 px-8 text-center text-[14px] font-body text-white/80"
        >
          Glisse pour découvrir — ou ferme pour explorer l'accueil.
        </Animated.Text>

        <View className="mb-4 h-[340px]">
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
          >
            {picks.map((pick, pickIndex) => (
              <Animated.View
                key={pick.id}
                entering={enterFadeIn(pickIndex + 2, reduceMotion)}
                className="items-center justify-center"
                style={{ width: SCREEN_WIDTH }}
              >
                {/* Les vraies cartes suivantes dépassent derrière la carte active. */}
                {picks.map((backPick, backIndex) => {
                  if (backIndex === pickIndex) {
                    return null;
                  }
                  const depth = (backIndex - pickIndex + picks.length) % picks.length;
                  return (
                    <View
                      key={`back-${backPick.id}`}
                      className="absolute"
                      pointerEvents="none"
                      style={{
                        transform: [
                          {
                            rotate: `${STACK_ROTATIONS[backIndex % STACK_ROTATIONS.length]}deg`,
                          },
                          { translateY: -depth * 10 },
                          { scale: 1 - depth * 0.05 },
                        ],
                        zIndex: picks.length - depth,
                      }}
                    >
                      <EventCompactCard
                        title={backPick.title}
                        reason={backPick.reason}
                        badge={backPick.badge}
                        badgeColor={backPick.badgeColor}
                        imageLabel={backPick.title}
                        imageSource={
                          backPick.imageUrl
                            ? { uri: backPick.imageUrl }
                            : PICK_PHOTOS[backIndex % PICK_PHOTOS.length]
                        }
                        imageAttribution={backPick.imageAttribution}
                        width={CARD_WIDTH}
                      />
                    </View>
                  );
                })}

                <View
                  style={{
                    zIndex: picks.length + 1,
                    transform: [
                      {
                        rotate: `${STACK_ROTATIONS[pickIndex % STACK_ROTATIONS.length]}deg`,
                      },
                    ],
                  }}
                >
                  <EventCompactCard
                    testID={`stacked-pick-card-${pickIndex}`}
                    title={pick.title}
                    reason={pick.reason}
                    badge={pick.badge}
                    badgeColor={pick.badgeColor}
                    imageLabel={pick.title}
                    imageSource={
                      pick.imageUrl
                        ? { uri: pick.imageUrl }
                        : PICK_PHOTOS[pickIndex % PICK_PHOTOS.length]
                    }
                    imageAttribution={pick.imageAttribution}
                    width={CARD_WIDTH}
                    onPress={() => openPick(pick.href)}
                  />
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        <View className="mb-5 flex-row justify-center gap-1.5">
          {picks.map((pick, pickIndex) => (
            <View
              key={`dot-${pick.id}`}
              className={`h-1.5 rounded-full ${
                pickIndex === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </View>

        <View className="gap-2.5 px-6">
          <PrimaryButton label="Fermer" onPress={onClose} />
          <Pressable
            accessibilityRole="button"
            onPress={onHideForToday}
            className="items-center py-2"
            testID="hide-stacked-picks-today"
          >
            <Text className="text-[14px] font-body text-white/80">
              Ne plus afficher pour aujourd'hui
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
