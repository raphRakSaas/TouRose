import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import type { PublicEventRow, PublicPlaceRow } from '@tourose/contracts';

import { CatalogListRow } from '@/components/ui/CatalogListRow';
import { Chip } from '@/components/ui/Chip';
import {
  fetchPublicCollections,
  fetchPublicPlaces,
  fetchUpcomingEvents,
  searchPublicCatalog,
} from '@/src/data/catalog-api';
import { getMomentRange, isEventInRange } from '@/src/domain/today-feed';

type CatalogSegment = 'events' | 'places' | 'collections';
type ExploreFilterKey = 'weekend' | 'free' | 'outdoor';

function filterEvents(
  events: PublicEventRow[],
  activeFilters: ReadonlySet<ExploreFilterKey>,
  now: Date,
): PublicEventRow[] {
  return events.filter((eventRow) => {
    if (activeFilters.has('free') && eventRow.price_type !== 'free') {
      return false;
    }
    if (
      activeFilters.has('outdoor') &&
      eventRow.indoor_outdoor !== 'outdoor' &&
      eventRow.indoor_outdoor !== 'mixed'
    ) {
      return false;
    }
    if (activeFilters.has('weekend')) {
      const range = getMomentRange('weekend', now);
      if (!isEventInRange(eventRow, range)) {
        return false;
      }
    }
    return true;
  });
}

function filterPlaces(
  places: PublicPlaceRow[],
  activeFilters: ReadonlySet<ExploreFilterKey>,
): PublicPlaceRow[] {
  return places.filter((placeRow) => {
    if (activeFilters.has('free') && placeRow.price_type !== 'free') {
      return false;
    }
    if (
      activeFilters.has('outdoor') &&
      placeRow.indoor_outdoor !== 'outdoor' &&
      placeRow.indoor_outdoor !== 'mixed'
    ) {
      return false;
    }
    // Weekend n'a pas de sens sur les lieux permanents — on ignore.
    return true;
  });
}

export default function ExploreScreen() {
  const routeParams = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<CatalogSegment>('events');
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<ExploreFilterKey>>(new Set());

  useEffect(() => {
    if (
      routeParams.segment === 'events' ||
      routeParams.segment === 'places' ||
      routeParams.segment === 'collections'
    ) {
      setSegment(routeParams.segment);
    }
  }, [routeParams.segment]);

  const eventsQuery = useQuery({
    queryKey: ['catalog', 'events', 100],
    queryFn: () => fetchUpcomingEvents(100),
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

  const collectionsQuery = useQuery({
    queryKey: ['catalog', 'collections'],
    queryFn: () => fetchPublicCollections(10),
    enabled: segment === 'collections',
  });

  const filteredEvents = useMemo(
    () => filterEvents(eventsQuery.data ?? [], activeFilters, new Date()),
    [eventsQuery.data, activeFilters],
  );

  const filteredPlaces = useMemo(
    () => filterPlaces(placesQuery.data ?? [], activeFilters),
    [placesQuery.data, activeFilters],
  );

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

  function toggleFilter(filterKey: ExploreFilterKey): void {
    setActiveFilters((previous) => {
      const next = new Set(previous);
      if (next.has(filterKey)) {
        next.delete(filterKey);
      } else {
        next.add(filterKey);
      }
      return next;
    });
  }

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

        {!isSearching && segment !== 'collections' ? (
          <View className="mb-2 flex-row flex-wrap gap-2">
            {(
              [
                ['weekend', 'Ce week-end'],
                ['free', 'Gratuit'],
                ['outdoor', 'Extérieur'],
              ] as const
            ).map(([key, label]) => {
              const isSelected = activeFilters.has(key);
              return (
                <Chip
                  key={key}
                  testID={`explore-filter-${key}`}
                  label={label}
                  selected={isSelected}
                  tone={isSelected ? 'solid' : 'white'}
                  onPress={() => toggleFilter(key)}
                />
              );
            })}
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
          data={filteredEvents}
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
            <Text className="text-sm font-body text-ink-500">
              Aucun événement pour ces filtres.
            </Text>
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
                imageSource={item.image_url ? { uri: item.image_url } : undefined}
                imageAttribution={item.image_attribution}
                showDivider={index < filteredEvents.length - 1}
              />
            </Link>
          )}
        />
      ) : null}

      {!isLoading && !errorMessage && !isSearching && segment === 'places' ? (
        <FlatList
          data={filteredPlaces}
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
            <Text className="text-sm font-body text-ink-500">Aucun lieu pour ces filtres.</Text>
          }
          renderItem={({ item, index }) => (
            <Link href={`/place/${item.slug}`} asChild>
              <CatalogListRow
                title={item.name}
                subtitle={`${item.place_type} · ${item.city ?? 'Toulouse'}`}
                imageLabel={item.name}
                showDivider={index < filteredPlaces.length - 1}
              />
            </Link>
          )}
        />
      ) : null}

      {!isLoading && !errorMessage && !isSearching && segment === 'collections' ? (
        <FlatList
          data={collectionsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-8"
          ListEmptyComponent={
            collectionsQuery.isLoading ? (
              <ActivityIndicator color="#C45C3E" />
            ) : (
              <Text className="text-sm font-body text-ink-500">
                Aucune collection publiée pour l'instant.
              </Text>
            )
          }
          renderItem={({ item, index }) => (
            <CatalogListRow
              title={item.title}
              subtitle={item.summary ?? 'Collection'}
              imageLabel={item.title}
              showDivider={index < (collectionsQuery.data?.length ?? 0) - 1}
            />
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}
