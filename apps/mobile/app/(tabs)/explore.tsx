import { ScrollView, Text, View } from 'react-native';

import { MOCK_EVENTS, MOCK_PLACES } from '@/src/data/mock-catalog';

export default function ExploreScreen() {
  return (
    <ScrollView className="flex-1 bg-sand-50" contentContainerClassName="gap-4 p-5">
      <Text className="text-2xl font-semibold text-ink-800">Explorer</Text>
      <Text className="text-sm text-ink-500">
        Catalogue placeholder — événements et lieux fictifs de démonstration.
      </Text>

      <Text className="mt-2 text-lg font-semibold text-brick-700">Événements</Text>
      {MOCK_EVENTS.map((eventItem) => (
        <View key={eventItem.id} className="rounded-lg bg-white p-4">
          <Text className="font-semibold text-ink-800">{eventItem.title}</Text>
          <Text className="text-sm text-ink-500">{eventItem.summary}</Text>
        </View>
      ))}

      <Text className="mt-2 text-lg font-semibold text-brick-700">Lieux</Text>
      {MOCK_PLACES.map((placeItem) => (
        <View key={placeItem.id} className="rounded-lg bg-white p-4">
          <Text className="font-semibold text-ink-800">{placeItem.name}</Text>
          <Text className="text-sm text-ink-500">{placeItem.summary}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
