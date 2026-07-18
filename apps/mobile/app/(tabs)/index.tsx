import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { fetchMockSuggestions } from '@/src/data/mock-catalog';
import { usePreferencesStore } from '@/src/store/preferences-store';

export default function TodayScreen() {
  const company = usePreferencesStore((state) => state.company);
  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', company],
    queryFn: () => fetchMockSuggestions(company),
  });

  return (
    <ScrollView className="flex-1 bg-sand-50" contentContainerClassName="gap-4 p-5">
      <Text className="font-display text-3xl text-ink-800">TouRose</Text>
      <Text className="text-base text-ink-600">Toulouse à voir, à vivre, à aimer.</Text>
      <Text className="mt-2 text-lg font-semibold text-brick-700">Trois idées pour toi</Text>
      <Text className="text-sm text-ink-500">Compagnie : {company}</Text>

      {suggestionsQuery.isLoading ? <ActivityIndicator color="#C45C3E" /> : null}

      {suggestionsQuery.data?.map((suggestion) => (
        <View key={suggestion.id} className="rounded-lg bg-sand-100 p-4">
          <Text className="text-lg font-semibold text-ink-800">{suggestion.title}</Text>
          <Text className="mt-1 text-sm text-garonne-700">{suggestion.reason}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
