import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { distanceFromToulouseCenter } from '@tourose/shared';
import type { PublicEventRow, PublicPlaceRow } from '@tourose/contracts';
import Constants from 'expo-constants';

import { CatalogListRow } from '@/components/ui/CatalogListRow';
import { Chip } from '@/components/ui/Chip';
import { fetchPublicPlaces, fetchUpcomingEvents } from '@/src/data/catalog-api';

type MapFilterKey = 'weekend' | 'free';
type MapPin =
  | { kind: 'event'; row: PublicEventRow; distanceKm: number }
  | { kind: 'place'; row: PublicPlaceRow; distanceKm: number };

function mapStyleUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim();
  const extra = Constants.expoConfig?.extra as { mapStyleUrl?: string } | undefined;
  const fromExtra = extra?.mapStyleUrl?.trim();
  const value = fromEnv || fromExtra || '';
  if (!value || value.includes('${') || value === 'undefined') {
    return null;
  }
  return value;
}

export default function MapScreen() {
  const [activeFilters, setActiveFilters] = useState<Set<MapFilterKey>>(new Set());
  const styleUrl = mapStyleUrl();

  const eventsQuery = useQuery({
    queryKey: ['catalog', 'events', 80],
    queryFn: () => fetchUpcomingEvents(80),
  });
  const placesQuery = useQuery({
    queryKey: ['catalog', 'places', 40],
    queryFn: () => fetchPublicPlaces(40),
  });

  const pins = useMemo(() => {
    const eventPins: MapPin[] = (eventsQuery.data ?? [])
      .filter((eventRow) => {
        if (activeFilters.has('free') && eventRow.price_type !== 'free') {
          return false;
        }
        return eventRow.latitude != null && eventRow.longitude != null;
      })
      .map((eventRow) => ({
        kind: 'event' as const,
        row: eventRow,
        distanceKm: distanceFromToulouseCenter(eventRow.latitude as number, eventRow.longitude as number),
      }));

    const placePins: MapPin[] = (placesQuery.data ?? [])
      .filter((placeRow) => {
        if (activeFilters.has('free') && placeRow.price_type !== 'free') {
          return false;
        }
        return placeRow.latitude != null && placeRow.longitude != null;
      })
      .map((placeRow) => ({
        kind: 'place' as const,
        row: placeRow,
        distanceKm: distanceFromToulouseCenter(placeRow.latitude as number, placeRow.longitude as number),
      }));

    return [...eventPins, ...placePins]
      .sort((first, second) => first.distanceKm - second.distanceKm)
      .slice(0, 40);
  }, [eventsQuery.data, placesQuery.data, activeFilters]);

  const selectedPin = pins[0] ?? null;
  const isLoading = eventsQuery.isLoading || placesQuery.isLoading;

  function toggleFilter(filterKey: MapFilterKey): void {
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

  return (
    <View className="flex-1 bg-garonne-100">
      <View className="absolute inset-0 bg-garonne-200/60" />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row flex-wrap gap-2 px-5 pt-3.5">
          <Chip
            testID="map-filter-weekend"
            label="Autour de moi"
            selected
            tone="solid"
          />
          <Chip
            testID="map-filter-free"
            label="Gratuit"
            selected={activeFilters.has('free')}
            tone={activeFilters.has('free') ? 'solid' : 'white'}
            onPress={() => toggleFilter('free')}
          />
        </View>

        <View className="mx-5 mt-3 rounded-2xl bg-white/90 px-3 py-2">
          <Text className="text-[12px] font-body text-ink-500">
            {styleUrl
              ? 'Carte interactive MapLibre disponible via development build (expo-dev-client).'
              : 'Configure EXPO_PUBLIC_MAP_STYLE_URL puis rebuild un development client pour MapLibre.'}
          </Text>
          <Text className="mt-1 text-[11px] font-body text-ink-300">
            © Contributeurs OpenStreetMap · style via fournisseur configuré (pas de CDN communautaire
            OSM en prod)
          </Text>
        </View>

        <View className="relative mt-3 flex-1 px-5">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#C45C3E" />
            </View>
          ) : (
            <FlatList
              data={pins}
              keyExtractor={(item) =>
                item.kind === 'event' ? `event-${item.row.id}` : `place-${item.row.id}`
              }
              contentContainerClassName="pb-28"
              ListHeaderComponent={
                <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
                  Proches du centre ({pins.length})
                </Text>
              }
              ListEmptyComponent={
                <Text className="text-sm font-body text-ink-500">
                  Aucun point géolocalisé pour ces filtres.
                </Text>
              }
              renderItem={({ item, index }) => {
                if (item.kind === 'event') {
                  return (
                    <Link href={`/event/${item.row.slug}`} asChild>
                      <CatalogListRow
                        title={item.row.title}
                        subtitle={`Événement · ${item.distanceKm.toFixed(1)} km`}
                        imageLabel={item.row.title}
                        imageSource={
                          item.row.image_url ? { uri: item.row.image_url } : undefined
                        }
                        showDivider={index < pins.length - 1}
                      />
                    </Link>
                  );
                }
                return (
                  <Link href={`/place/${item.row.slug}`} asChild>
                    <CatalogListRow
                      title={item.row.name}
                      subtitle={`${item.row.place_type} · ${item.distanceKm.toFixed(1)} km`}
                      imageLabel={item.row.name}
                      showDivider={index < pins.length - 1}
                    />
                  </Link>
                );
              }}
            />
          )}

          <View className="absolute bottom-4 right-0 h-11 w-11 items-center justify-center rounded-full bg-white">
            <FontAwesome name="crosshairs" size={18} color="#1F1C19" />
          </View>
        </View>

        {selectedPin ? (
          <Link
            href={
              (selectedPin.kind === 'event'
                ? `/event/${selectedPin.row.slug}`
                : `/place/${selectedPin.row.slug}`) as never
            }
            asChild
          >
            <Pressable className="rounded-t-3xl bg-sand-50 px-5 pb-5 pt-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-garonne-100">
                  <FontAwesome
                    name={selectedPin.kind === 'event' ? 'calendar' : 'map-marker'}
                    size={18}
                    color="#26525C"
                  />
                </View>
                <View className="flex-1 justify-center">
                  <Text className="text-[15px] font-body-semibold text-ink-800">
                    {selectedPin.kind === 'event'
                      ? selectedPin.row.title
                      : selectedPin.row.name}
                  </Text>
                  <Text className="text-[13px] font-body text-ink-500">
                    {selectedPin.distanceKm.toFixed(1)} km du centre · appuyer pour ouvrir
                  </Text>
                </View>
              </View>
            </Pressable>
          </Link>
        ) : null}
      </SafeAreaView>
    </View>
  );
}
