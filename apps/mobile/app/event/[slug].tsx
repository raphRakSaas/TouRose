import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { fetchPublicEventBySlug } from '@/src/data/catalog-api';

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const eventSlug = typeof slug === 'string' ? slug : '';

  const eventQuery = useQuery({
    queryKey: ['catalog', 'event', eventSlug],
    queryFn: () => fetchPublicEventBySlug(eventSlug),
    enabled: eventSlug.length > 0,
  });

  const eventRow = eventQuery.data;

  return (
    <>
      <Stack.Screen
        options={{ title: eventRow?.title ?? 'Événement', headerBackTitle: 'Explorer' }}
      />
      <ScrollView
        className="flex-1 bg-sand-50"
        contentContainerClassName="gap-4 p-5"
        refreshControl={
          <RefreshControl
            refreshing={eventQuery.isRefetching}
            onRefresh={() => {
              void eventQuery.refetch();
            }}
            tintColor="#C45C3E"
          />
        }
      >
        {eventQuery.isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#C45C3E" />
          </View>
        ) : null}

        {eventQuery.error ? (
          <View className="gap-2">
            <Text className="text-base font-semibold text-brick-700">Impossible de charger</Text>
            <Text className="text-sm text-ink-600">{eventQuery.error.message}</Text>
          </View>
        ) : null}

        {!eventQuery.isLoading && !eventQuery.error && !eventRow ? (
          <Text className="text-sm text-ink-500">Événement introuvable ou non publié.</Text>
        ) : null}

        {eventRow ? (
          <View className="gap-3">
            <Text className="text-2xl font-semibold text-ink-800">{eventRow.title}</Text>
            {eventRow.next_starts_at ? (
              <Text className="text-sm text-garonne-700">
                {new Date(eventRow.next_starts_at).toLocaleString('fr-FR')}
              </Text>
            ) : null}
            <Text className="text-sm text-ink-500">
              {eventRow.price_type} · {eventRow.indoor_outdoor}
            </Text>
            <Text className="text-base text-ink-600">{eventRow.summary ?? 'Sans résumé'}</Text>
            {eventRow.official_url ? (
              <Text className="text-sm text-brick-600">{eventRow.official_url}</Text>
            ) : null}
            <Link href="/(tabs)/explore" asChild>
              <Pressable className="mt-4 self-start rounded-md bg-brick-500 px-4 py-2">
                <Text className="text-white">Retour Explorer</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
