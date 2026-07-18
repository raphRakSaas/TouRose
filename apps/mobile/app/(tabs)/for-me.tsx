import { Pressable, Text, View } from 'react-native';

import { usePreferencesStore } from '@/src/store/preferences-store';

const COMPANY_OPTIONS = ['seul', 'couple', 'amis', 'famille'] as const;

export default function ForMeScreen() {
  const company = usePreferencesStore((state) => state.company);
  const setCompany = usePreferencesStore((state) => state.setCompany);

  return (
    <View className="flex-1 gap-4 bg-sand-50 p-5">
      <Text className="text-2xl font-semibold text-ink-800">Pour moi</Text>
      <Text className="text-sm text-ink-500">
        Favoris, visites et préférences restent locaux tant qu’aucun compte n’est créé. Aucune
        connexion obligatoire.
      </Text>

      <Text className="text-base font-semibold text-brick-700">Compagnie préférée</Text>
      <View className="flex-row flex-wrap gap-2">
        {COMPANY_OPTIONS.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            onPress={() => setCompany(option)}
            className={`rounded-md px-3 py-2 ${company === option ? 'bg-brick-500' : 'bg-sand-100'}`}
          >
            <Text className={company === option ? 'text-white' : 'text-ink-700'}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
