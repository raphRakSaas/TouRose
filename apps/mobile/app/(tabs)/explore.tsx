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
import { distanceInKilometers } from '@tourose/shared';

import { CatalogListRow } from '@/components/ui/CatalogListRow';
import { Chip } from '@/components/ui/Chip';
import {
  fetchPublicCollections,
  fetchPublicPlaces,
  fetchUpcomingEvents,
  searchPublicCatalog,
} from '@/src/data/catalog-api';
import { formatDistanceLabel, placeTypeLabel } from '@/src/domain/place-labels';
import { getMomentRange, isEventInRange } from '@/src/domain/today-feed';
import { getUserCoordinatesOrToulouse } from '@/src/lib/location';

type CatalogSegment = 'events' | 'places' | 'collections';
type ExploreFilterKey = 'weekend' | 'free' | 'outdoor' | 'nearby';

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
    return true;
  });
}

function placeSubtitle(
  placeRow: PublicPlaceRow,
  origin: { latitude: number; longitude: number } | undefined,
): string {
  const typeLabel = placeTypeLabel(placeRow.place_type);
  const cityLabel = placeRow.city ?? 'Toulouse';
  if (origin && placeRow.latitude != null && placeRow.longitude != null) {
    const distanceKm = distanceInKilometers(
      origin.latitude,
      origin.longitude,
      placeRow.latitude,
      placeRow.longitude,
    );
    return `${typeLabel} · ${formatDistanceLabel(distanceKm)} · ${cityLabel}`;
  }
  return `${typeLabel} · ${cityLabel}`;
}

export default function ExploreScreen() {
  const routeParams = useLocalSearchParams<{ segment?: string }>();
  const [segment, setSegment] = useState<CatalogSegment>('events');
  const [searchText, setSearchText] = useState('');
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

  const userLocationQuery = useQuery({
    queryKey: ['user-coordinates'],
    queryFn: getUserCoordinatesOrToulouse,
    staleTime: 5 * 60 * 1000,
  });

  const eventsQuery = useQuery({
    queryKey: ['catalog', 'events', 100],
    queryFn: () => fetchUpcomingEvents(100),
  });

  const placesQuery = useQuery({
    queryKey: [
      'catalog',
      'places',
      'discovery',
      userLocationQuery.data?.latitude,
      userLocationQuery.data?.longitude,
    ],
    queryFn: () =>
      fetchPublicPlaces({
        limitCount: 80,
        latitude: userLocationQuery.data?.latitude,
        longitude: userLocationQuery.data?.longitude,
        discoveryOnly: true,
      }),
    enabled: Boolean(userLocationQuery.data),
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

  const filteredPlaces = useMemo(() => {
    const places = filterPlaces(placesQuery.data ?? [], activeFilters);
    if (!activeFilters.has('nearby') || !userLocationQuery.data) {
      return places;
    }
    return places.filter((placeRow) => {
      if (placeRow.latitude == null || placeRow.longitude == null) {
        return false;
      }
      return (
        distanceInKilometers(
          userLocationQuery.data.latitude,
          userLocationQuery.data.longitude,
          placeRow.latitude,
          placeRow.longitude,
        ) <= 3
      );
    });
  }, [placesQuery.data, activeFilters, userLocationQuery.data]);

  const isSearching = searchText.trim().length >= 2;
  const isLoading =
    (!isSearching && segment === 'events' && eventsQuery.isLoading) ||
    (!isSearching &&
      segment === 'places' &&
      (userLocationQuery.isLoading || placesQuery.isLoading)) ||
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
    await Promise.all([userLocationQuery.refetch(), placesQuery.refetch()]);
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
            placeholder="Rechercher un lieu, un événement…"
            placeholderTextColor="#A39B90"
            className="flex-1 text-[15px] font-body text-ink-800"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchText.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => setSearchText('')}>
              <FontAwesome name="times-circle" size={16} color="#A39B90" />
            </Pressable>
          ) : null}
        </View>

        <View className="mb-3 flex-row gap-2">
          {(
            [
              ['events', 'Événements'],
              ['places', 'Lieux'],
              ['collections', 'Sélections'],
            ] as const
          ).map(([segmentKey, label]) => {
            const isActive = segment === segmentKey;
            return (
              <Pressable
                key={segmentKey}
                accessibilityRole="button"
                onPress={() => setSegment(segmentKey)}
                className={`rounded-full px-3.5 py-2 ${
                  isActive ? 'bg-brick-500' : 'bg-white'
                }`}
              >
                <Text
                  className={`text-[13px] font-body-semibold ${
                    isActive ? 'text-white' : 'text-ink-600'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!isSearching ? (
          <View className="flex-row flex-wrap gap-2">
            {segment === 'events' ? (
              <Chip
                label="Ce week-end"
                selected={activeFilters.has('weekend')}
                onPress={() => toggleFilter('weekend')}
              />
            ) : null}
            {segment === 'places' ? (
              <Chip
                label="Autour de moi"
                selected={activeFilters.has('nearby')}
                onPress={() => toggleFilter('nearby')}
              />
            ) : null}
            <Chip
              label="Gratuit"
              selected={activeFilters.has('free')}
              onPress={() => toggleFilter('free')}
            />
            <Chip
              label="Dehors"
              selected={activeFilters.has('outdoor')}
              onPress={() => toggleFilter('outdoor')}
            />
          </View>
        ) : null}

        {segment === 'places' && !isSearching ? (
          <Text className="mt-2.5 text-[12px] font-body text-ink-500">
            Parcs, monuments, coins et bons plans — triés par proximité.
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#C45C3E" />
        </View>
      ) : null}

      {errorMessage ? (
        <View className="px-5">
          <Text className="text-sm font-body text-brick-700">{errorMessage}</Text>
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
              href={
                item.entity_type === 'place'
                  ? `/place/${item.slug}`
                  : `/event/${item.slug}`
              }
              asChild
            >
              <CatalogListRow
                title={item.title}
                subtitle={
                  item.entity_type === 'place'
                    ? item.summary ?? 'Lieu'
                    : item.summary ?? 'Événement'
                }
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
                subtitle={placeSubtitle(item, userLocationQuery.data)}
                imageLabel={item.name}
                imageSource={item.image_url ? { uri: item.image_url } : undefined}
                imageAttribution={item.image_attribution}
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
                Aucune sélection pour le moment.
              </Text>
            )
          }
          renderItem={({ item, index }) => (
            <CatalogListRow
              title={item.title}
              subtitle={item.summary ?? 'Sélection éditoriale'}
              imageLabel={item.title}
              showDivider={index < (collectionsQuery.data?.length ?? 0) - 1}
            />
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}
