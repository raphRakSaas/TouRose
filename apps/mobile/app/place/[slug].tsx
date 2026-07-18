import { useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { fetchPublicPlaceBySlug } from '@/src/data/catalog-api';

export default function PlaceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const placeSlug = typeof slug === 'string' ? slug : '';

  const placeQuery = useQuery({
    queryKey: ['catalog', 'place', placeSlug],
    queryFn: () => fetchPublicPlaceBySlug(placeSlug),
    enabled: placeSlug.length > 0,
  });

  const placeRow = placeQuery.data;

  return (
    <>
      <Stack.Screen options={{ title: placeRow?.name ?? 'Lieu', headerBackTitle: 'Explorer' }} />
      <ScrollView
        className="flex-1 bg-sand-50"
        contentContainerClassName="gap-4 p-5"
        refreshControl={
          <RefreshControl
            refreshing={placeQuery.isRefetching}
            onRefresh={() => {
              void placeQuery.refetch();
            }}
            tintColor="#C45C3E"
          />
        }
      >
        {placeQuery.isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#C45C3E" />
          </View>
        ) : null}

        {placeQuery.error ? (
          <View className="gap-2">
            <Text className="text-base font-semibold text-brick-700">Impossible de charger</Text>
            <Text className="text-sm text-ink-600">{placeQuery.error.message}</Text>
          </View>
        ) : null}

        {!placeQuery.isLoading && !placeQuery.error && !placeRow ? (
          <Text className="text-sm text-ink-500">Lieu introuvable ou non publié.</Text>
        ) : null}

        {placeRow ? (
          <View className="gap-3">
            <Text className="text-2xl font-semibold text-ink-800">{placeRow.name}</Text>
            <Text className="text-sm text-garonne-700">
              {placeRow.place_type} · {placeRow.city ?? 'Toulouse'} · {placeRow.price_type}
            </Text>
            <Text className="text-base text-ink-600">{placeRow.summary ?? 'Sans résumé'}</Text>
            {placeRow.latitude != null && placeRow.longitude != null ? (
              <Text className="text-xs text-ink-500">
                {placeRow.latitude.toFixed(5)}, {placeRow.longitude.toFixed(5)}
              </Text>
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
