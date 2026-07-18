import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TOULOUSE_PHOTOS } from '@/src/assets/photos';
import {
  INTEREST_OPTIONS,
  usePreferencesStore,
} from '@/src/store/preferences-store';

const HERO_SLIDES = [
  {
    id: 'capitole',
    photo: TOULOUSE_PHOTOS.hero,
    caption: 'La place du Capitole',
  },
  {
    id: 'garonne',
    photo: TOULOUSE_PHOTOS.saintCyprien,
    caption: 'Les quais de la Garonne',
  },
  {
    id: 'pont-neuf',
    photo: TOULOUSE_PHOTOS.baladeNocturne,
    caption: 'Le Pont Neuf à la nuit tombée',
  },
] as const;

const AUTO_SCROLL_DELAY_MS = 4000;

function HeroCarouselStep({ onSkip, onContinue }: { onSkip: () => void; onContinue: () => void }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const carouselRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-défilement : le timer repart après chaque changement de slide
  // (manuel ou automatique), donc un swipe ne se fait jamais couper.
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSlide = (activeSlide + 1) % HERO_SLIDES.length;
      carouselRef.current?.scrollTo({ x: nextSlide * screenWidth, animated: true });
      setActiveSlide(nextSlide);
    }, AUTO_SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [activeSlide, screenWidth]);

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    if (slideIndex !== activeSlide) {
      setActiveSlide(slideIndex);
    }
  }

  return (
    <View className="flex-1 bg-ink-900">
      <StatusBar style="light" />

      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        className="absolute inset-0"
      >
        {HERO_SLIDES.map((slide) => (
          <View key={slide.id} style={{ width: screenWidth, height: screenHeight }}>
            <Image
              source={slide.photo}
              accessibilityLabel={slide.caption}
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        ))}
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,18,16,0.55)', 'rgba(20,18,16,0)', 'rgba(20,18,16,0.85)']}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View
        pointerEvents="box-none"
        className="flex-1 justify-between px-7"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      >
        <Animated.Text
          entering={FadeIn.duration(600)}
          className="font-display text-[26px] text-white"
        >
          TouRose
        </Animated.Text>

        <View pointerEvents="box-none">
          <Animated.Text
            key={HERO_SLIDES[activeSlide].id}
            entering={FadeIn.duration(500)}
            className="mb-3 text-[13px] font-body-semibold uppercase tracking-wide text-white/70"
          >
            {HERO_SLIDES[activeSlide].caption}
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.duration(600).delay(200)}
            className="mb-3.5 font-display text-[30px] leading-[1.15] text-white"
          >
            Toulouse, à voir, à vivre, à aimer.
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.duration(600).delay(450)}
            className="mb-6 text-[15px] leading-[1.6] font-body text-white/85"
          >
            Chaque jour, trois idées de sorties choisies pour toi. Le reste de la ville est à
            portée de main.
          </Animated.Text>

          <Animated.View
            entering={FadeIn.duration(500).delay(650)}
            className="mb-7 flex-row gap-1.5"
          >
            {HERO_SLIDES.map((slide, slideIndex) => (
              <View
                key={slide.id}
                className={`h-1.5 rounded-full ${
                  slideIndex === activeSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(600).delay(800)}
            className="flex-row items-center justify-between"
          >
            <Pressable accessibilityRole="button" onPress={onSkip} className="px-1 py-2">
              <Text className="text-[14px] font-body text-white/70">Passer</Text>
            </Pressable>
            <PrimaryButton label="Continuer" onPress={onContinue} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const interests = usePreferencesStore((state) => state.interests);
  const toggleInterest = usePreferencesStore((state) => state.toggleInterest);
  const completeOnboarding = usePreferencesStore((state) => state.completeOnboarding);

  function finish(): void {
    completeOnboarding();
    router.replace('/(tabs)');
  }

  if (step === 1) {
    return <HeroCarouselStep onSkip={finish} onContinue={() => setStep(2)} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top', 'bottom']}>
      {step === 2 ? (
        <View className="flex-1">
          <ScrollView className="flex-1" contentContainerClassName="px-7 pb-7 pt-10">
            <Text className="mb-2 font-display text-2xl text-ink-800">
              Qu'est-ce qui te fait sortir ?
            </Text>
            <Text className="mb-6 text-[14px] font-body text-ink-500">
              Choisis-en quelques-uns, tu pourras changer plus tard.
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {INTEREST_OPTIONS.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  selected={interests.includes(interest)}
                  onPress={() => toggleInterest(interest)}
                />
              ))}
            </View>
          </ScrollView>
          <View className="flex-row items-center justify-between px-7 pb-7 pt-4">
            <Pressable accessibilityRole="button" onPress={finish}>
              <Text className="text-[14px] font-body text-ink-300">Passer</Text>
            </Pressable>
            <PrimaryButton label="Continuer" onPress={() => setStep(3)} />
          </View>
        </View>
      ) : null}

      {step === 3 ? (
        <View className="flex-1">
          <ScrollView className="flex-1" contentContainerClassName="items-center px-7 pb-7 pt-10">
            <View className="mb-6 mt-[60px] h-16 w-16 items-center justify-center rounded-2xl bg-garonne-100">
              <FontAwesome name="map-marker" size={26} color="#26525C" />
            </View>
            <Text className="mb-3 text-center font-display text-[22px] text-ink-800">
              On te propose des idées près de toi
            </Text>
            <Text className="text-center text-[15px] leading-[1.6] font-body text-ink-500">
              iOS va te demander l'autorisation dans un instant. Sans elle, tu peux toujours
              chercher un quartier ou une adresse à la main.
            </Text>
          </ScrollView>
          <View className="gap-2.5 px-7 pb-7 pt-4">
            <PrimaryButton label="D'accord" onPress={finish} />
            <Pressable accessibilityRole="button" onPress={finish} className="items-center py-2">
              <Text className="text-[14px] font-body text-ink-300">
                Saisir une adresse à la place
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
