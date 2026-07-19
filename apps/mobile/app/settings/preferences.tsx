import { Stack, router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  INTEREST_OPTIONS,
  usePreferencesStore,
  type CompanyPreference,
} from '@/src/store/preferences-store';

const COMPANY_OPTIONS: ReadonlyArray<[CompanyPreference, string]> = [
  ['seul', 'Seul·e'],
  ['couple', 'En couple'],
  ['amis', 'Entre amis'],
  ['famille', 'En famille'],
];

export default function PreferencesSettingsScreen() {
  const company = usePreferencesStore((state) => state.company);
  const interests = usePreferencesStore((state) => state.interests);
  const setCompany = usePreferencesStore((state) => state.setCompany);
  const toggleInterest = usePreferencesStore((state) => state.toggleInterest);
  const resetPreferences = usePreferencesStore((state) => state.resetPreferences);
  const resetOnboarding = usePreferencesStore((state) => state.resetOnboarding);

  function confirmReset(): void {
    Alert.alert(
      'Réinitialiser mes préférences',
      'Centres d’intérêt, compagnie et notifications reviendront aux valeurs par défaut.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: () => resetPreferences() },
      ],
    );
  }

  function replayOnboarding(): void {
    resetOnboarding();
    router.replace('/onboarding' as never);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Préférences' }} />
      <ScrollView className="flex-1 bg-sand-50" contentContainerClassName="px-5 pb-12 pt-4">
        <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
          Centres d’intérêt
        </Text>
        <Text className="mb-3 text-[14px] leading-[1.6] font-body text-ink-500">
          Ils orientent les suggestions de la page « Aujourd’hui » et les recommandations.
        </Text>
        <View className="mb-7 flex-row flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => {
            const isSelected = interests.includes(interest);
            return (
              <Pressable
                key={interest}
                testID={`pref-interest-${interest}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => toggleInterest(interest)}
                className={`rounded-full px-4 py-2 ${isSelected ? 'bg-brick-500' : 'bg-white'}`}
              >
                <Text
                  className={`text-[13px] ${
                    isSelected ? 'font-body-semibold text-white' : 'font-body text-ink-800'
                  }`}
                >
                  {interest}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
          Je sors plutôt…
        </Text>
        <View className="mb-9 flex-row flex-wrap gap-2">
          {COMPANY_OPTIONS.map(([value, label]) => {
            const isSelected = company === value;
            return (
              <Pressable
                key={value}
                testID={`pref-company-${value}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setCompany(value)}
                className={`rounded-full px-4 py-2 ${isSelected ? 'bg-brick-500' : 'bg-white'}`}
              >
                <Text
                  className={`text-[13px] ${
                    isSelected ? 'font-body-semibold text-white' : 'font-body text-ink-800'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-3">
          <PrimaryButton
            label="Revoir l’introduction"
            variant="outline"
            onPress={replayOnboarding}
          />
          <Pressable
            testID="pref-reset"
            accessibilityRole="button"
            onPress={confirmReset}
            className="items-center py-3"
          >
            <Text className="text-[14px] font-body-semibold text-brick-700">
              Réinitialiser mes préférences
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
