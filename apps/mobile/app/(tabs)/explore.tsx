import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  fetchPublicPlaces,
  fetchUpcomingEvents,
  searchPublicCatalog,
} from '@/src/data/catalog-api';

type CatalogSegment = 'events' | 'places' | 'search';

export default function ExploreScreen() {
  const [segment, setSegment] = useState<CatalogSegment>('events');
  const [searchText, setSearchText] = useState('');

  const eventsQuery = useQuery({
    queryKey: ['catalog', 'events'],
    queryFn: () => fetchUpcomingEvents(30),
  });

  const placesQuery = useQuery({
    queryKey: ['catalog', 'places'],
    queryFn: () => fetchPublicPlaces(50),
  });

  const searchQuery = useQuery({
    queryKey: ['catalog', 'search', searchText],
    queryFn: () => searchPublicCatalog(searchText),
    enabled: segment === 'search' && searchText.trim().length >= 2,
  });

  const isLoading =
    (segment === 'events' && eventsQuery.isLoading) ||
    (segment === 'places' && placesQuery.isLoading) ||
    (segment === 'search' && searchQuery.isFetching);

  const isRefreshing =
    (segment === 'events' && eventsQuery.isRefetching) ||
    (segment === 'places' && placesQuery.isRefetching) ||
    (segment === 'search' && searchQuery.isRefetching);

  const errorMessage =
    (segment === 'events' && eventsQuery.error?.message) ||
    (segment === 'places' && placesQuery.error?.message) ||
    (segment === 'search' && searchQuery.error?.message) ||
    null;

  async function onRefresh(): Promise<void> {
    if (segment === 'events') {
      await eventsQuery.refetch();
      return;
    }
    if (segment === 'places') {
      await placesQuery.refetch();
      return;
    }
    if (searchText.trim().length >= 2) {
      await searchQuery.refetch();
    }
  }

  const refreshControl = (
    <RefreshControl refreshing={isRefreshing} onRefresh={() => void onRefresh()} tintColor="#C45C3E" />
  );

  return (
    <View className="flex-1 bg-sand-50">
      <View className="gap-3 border-b border-sand-200 px-5 pb-4 pt-5">
        <Text className="text-2xl font-semibold text-ink-800">Explorer</Text>
        <Text className="text-sm text-ink-500">Catalogue publié via Supabase (vues / RPC).</Text>
        <View className="flex-row flex-wrap gap-2">
          {(
            [
              ['events', 'Événements'],
              ['places', 'Lieux'],
              ['search', 'Recherche'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              onPress={() => setSegment(value)}
              className={`rounded-md px-3 py-2 ${segment === value ? 'bg-brick-500' : 'bg-sand-100'}`}
            >
              <Text className={segment === value ? 'text-white' : 'text-ink-700'}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {segment === 'search' ? (
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Ex. jardin, balade…"
            placeholderTextColor="#7A7369"
            className="rounded-md border border-sand-200 bg-white px-3 py-2 text-ink-800"
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C45C3E" />
        </View>
      ) : null}

      {errorMessage ? (
        <View className="gap-2 p-5">
          <Text className="text-base font-semibold text-brick-700">Impossible de charger</Text>
          <Text className="text-sm text-ink-600">{errorMessage}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onRefresh()}
            className="self-start rounded-md bg-brick-500 px-3 py-2"
          >
            <Text className="text-white">Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !errorMessage && segment === 'events' ? (
        <FlatList
          data={eventsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-5"
          refreshControl={refreshControl}
          ListEmptyComponent={
            <Text className="text-sm text-ink-500">Aucun événement à venir publié.</Text>
          }
          renderItem={({ item }) => (
            <Link href={`/event/${item.slug}`} asChild>
              <Pressable className="rounded-lg bg-white p-4">
                <Text className="font-semibold text-ink-800">{item.title}</Text>
                <Text className="mt-1 text-sm text-ink-500">{item.summary ?? 'Sans résumé'}</Text>
                {item.next_starts_at ? (
                  <Text className="mt-2 text-xs text-garonne-700">
                    {new Date(item.next_starts_at).toLocaleString('fr-FR')}
                  </Text>
                ) : null}
              </Pressable>
            </Link>
          )}
        />
      ) : null}

      {!isLoading && !errorMessage && segment === 'places' ? (
        <FlatList
          data={placesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 p-5"
          refreshControl={refreshControl}
          ListEmptyComponent={<Text className="text-sm text-ink-500">Aucun lieu publié.</Text>}
          renderItem={({ item }) => (
            <Link href={`/place/${item.slug}`} asChild>
              <Pressable className="rounded-lg bg-white p-4">
                <Text className="font-semibold text-ink-800">{item.name}</Text>
                <Text className="mt-1 text-sm text-ink-500">{item.summary ?? 'Sans résumé'}</Text>
                <Text className="mt-2 text-xs text-garonne-700">
                  {item.place_type} · {item.city ?? 'Toulouse'}
                </Text>
              </Pressable>
            </Link>
          )}
        />
      ) : null}

      {!isLoading && !errorMessage && segment === 'search' ? (
        <FlatList
          data={searchQuery.data ?? []}
          keyExtractor={(item) => `${item.entity_type}-${item.id}`}
          contentContainerClassName="gap-3 p-5"
          refreshControl={refreshControl}
          ListEmptyComponent={
            <Text className="text-sm text-ink-500">
              {searchText.trim().length < 2
                ? 'Tape au moins 2 caractères.'
                : 'Aucun résultat — élargis ta recherche.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Link
              href={item.entity_type === 'place' ? `/place/${item.slug}` : `/event/${item.slug}`}
              asChild
            >
              <Pressable className="rounded-lg bg-white p-4">
                <Text className="text-xs uppercase text-brick-600">{item.entity_type}</Text>
                <Text className="font-semibold text-ink-800">{item.title}</Text>
                <Text className="mt-1 text-sm text-ink-500">{item.summary ?? ''}</Text>
              </Pressable>
            </Link>
          )}
        />
      ) : null}
    </View>
  );
}
