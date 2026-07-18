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
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { CatalogListRow } from '@/components/ui/CatalogListRow';
import { Chip } from '@/components/ui/Chip';
import {
  fetchPublicPlaces,
  fetchUpcomingEvents,
  searchPublicCatalog,
} from '@/src/data/catalog-api';

type CatalogSegment = 'events' | 'places' | 'collections';

export default function ExploreScreen() {
  const [segment, setSegment] = useState<CatalogSegment>('events');
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
    enabled: searchText.trim().length >= 2,
  });

  const isSearching = searchText.trim().length >= 2;
  const isLoading =
    (!isSearching && segment === 'events' && eventsQuery.isLoading) ||
    (!isSearching && segment === 'places' && placesQuery.isLoading) ||
    (isSearching && searchQuery.isFetching);

  const isRefreshing =
    (segment === 'events' && eventsQuery.isRefetching) ||
    (segment === 'places' && placesQuery.isRefetching) ||
    searchQuery.isRefetching;

  const errorMessage =
    (!isSearching && segment === 'events' && eventsQuery.error?.message) ||
    (!isSearching && segment === 'places' && placesQuery.error?.message) ||
    (isSearching && searchQuery.error?.message) ||
    null;

  async function onRefresh(): Promise<void> {
    if (isSearching) {
      await searchQuery.refetch();
      return;
    }
    if (segment === 'events') {
      await eventsQuery.refetch();
      return;
    }
    await placesQuery.refetch();
  }

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <View className="px-5 pb-3 pt-4">
        <Text className="mb-3 font-display text-2xl text-ink-800">Explorer</Text>
        <View
          className="mb-3.5 flex-row items-center gap-2.5 rounded-2xl bg-white px-4 py-3"
          style={{
            shadowColor: '#1F1C19',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <FontAwesome name="search" size={14} color="#A39B90" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Rechercher à Toulouse"
            placeholderTextColor="#A39B90"
            className="flex-1 text-[15px] font-body text-ink-800"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSearchFocused || searchText ? (
            <Pressable accessibilityRole="button" onPress={() => setSearchText('')}>
              <Text className="text-[13px] font-body text-brick-900">Effacer</Text>
            </Pressable>
          ) : null}
        </View>

        {!isSearching ? (
          <View className="mb-3.5 flex-row gap-5 border-b border-sand-200">
            {(
              [
                ['events', 'Événements'],
                ['places', 'Lieux'],
                ['collections', 'Collections'],
              ] as const
            ).map(([value, label]) => {
              const isActive = segment === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => setSegment(value)}
                  className={`pb-2.5 ${isActive ? 'border-b-2 border-brick-500' : ''}`}
                >
                  <Text
                    className={`text-[14px] ${
                      isActive
                        ? 'font-body-bold text-brick-500'
                        : 'font-body text-ink-300'
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!isSearching ? (
          <View className="mb-2 flex-row gap-2">
            <Chip label="Ce week-end" />
            <Chip label="Gratuit" />
            <Chip label="Extérieur" />
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C45C3E" />
        </View>
      ) : null}

      {errorMessage ? (
        <View className="gap-2 px-5">
          <Text className="text-base font-body-semibold text-brick-700">Impossible de charger</Text>
          <Text className="text-sm font-body text-ink-500">{errorMessage}</Text>
        </View>
      ) : null}

      {!isLoading && !errorMessage && isSearching ? (
        <FlatList
          data={searchQuery.data ?? []}
          keyExtractor={(item) => `${item.entity_type}-${item.id}`}
          contentContainerClassName="px-5 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor="#C45C3E"
            />
          }
          ListEmptyComponent={
            <Text className="text-sm font-body text-ink-500">Aucun résultat.</Text>
          }
          renderItem={({ item, index }) => (
            <Link
              href={item.entity_type === 'place' ? `/place/${item.slug}` : `/event/${item.slug}`}
              asChild
            >
              <CatalogListRow
                title={item.title}
                subtitle={item.summary ?? item.entity_type}
                imageLabel={item.title}
                showDivider={index < (searchQuery.data?.length ?? 0) - 1}
              />
            </Link>
          )}
        />
      ) : null}

      {!isLoading && !errorMessage && !isSearching && segment === 'events' ? (
        <FlatList
          data={eventsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor="#C45C3E"
            />
          }
          ListEmptyComponent={
            <Text className="text-sm font-body text-ink-500">Aucun événement à venir publié.</Text>
          }
          renderItem={({ item, index }) => (
            <Link href={`/event/${item.slug}`} asChild>
              <CatalogListRow
                title={item.title}
                subtitle={
                  item.next_starts_at
                    ? new Date(item.next_starts_at).toLocaleString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                      })
                    : item.summary ?? 'Événement'
                }
                imageLabel={item.title}
                showDivider={index < (eventsQuery.data?.length ?? 0) - 1}
              />
            </Link>
          )}
        />
      ) : null}

      {!isLoading && !errorMessage && !isSearching && segment === 'places' ? (
        <FlatList
          data={placesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor="#C45C3E"
            />
          }
          ListEmptyComponent={
            <Text className="text-sm font-body text-ink-500">Aucun lieu publié.</Text>
          }
          renderItem={({ item, index }) => (
            <Link href={`/place/${item.slug}`} asChild>
              <CatalogListRow
                title={item.name}
                subtitle={`${item.place_type} · ${item.city ?? 'Toulouse'}`}
                imageLabel={item.name}
                showDivider={index < (placesQuery.data?.length ?? 0) - 1}
              />
            </Link>
          )}
        />
      ) : null}

      {!isLoading && !errorMessage && !isSearching && segment === 'collections' ? (
        <View className="px-5">
          <Text className="text-sm font-body text-ink-500">
            Les collections éditoriales arriveront ici — pour l'instant, explore événements et
            lieux.
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
