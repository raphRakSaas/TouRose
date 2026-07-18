import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  INTEREST_OPTIONS,
  usePreferencesStore,
} from '@/src/store/preferences-store';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const interests = usePreferencesStore((state) => state.interests);
  const toggleInterest = usePreferencesStore((state) => state.toggleInterest);
  const completeOnboarding = usePreferencesStore((state) => state.completeOnboarding);

  function finish(): void {
    completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top', 'bottom']}>
      {step === 1 ? (
        <View className="flex-1">
          <ScrollView className="flex-1" contentContainerClassName="px-7 pb-7 pt-10">
            <Text className="mb-6 font-display text-[26px] text-brick-900">TouRose</Text>
            <ImagePlaceholder
              label="Toulouse — photo d'ambiance"
              className="mb-7 w-full rounded-3xl"
              height={220}
            />
            <Text className="mb-3.5 font-display text-[26px] leading-[1.2] text-ink-800">
              On a emménagé à Toulouse. Voici l'app qu'on aurait aimé avoir.
            </Text>
            <Text className="text-[15px] leading-[1.6] font-body text-ink-500">
              Trois idées adaptées à ta situation, puis tout Toulouse à portée de main.
            </Text>
          </ScrollView>
          <View className="flex-row items-center justify-between px-7 pb-7 pt-4">
            <Pressable accessibilityRole="button" onPress={finish}>
              <Text className="text-[14px] font-body text-ink-300">Passer</Text>
            </Pressable>
            <PrimaryButton label="Continuer" onPress={() => setStep(2)} />
          </View>
        </View>
      ) : null}

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
