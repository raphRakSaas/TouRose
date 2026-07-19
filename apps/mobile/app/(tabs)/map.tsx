import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { PublicEventRow, PublicPlaceRow } from '@tourose/contracts';
import { distanceInKilometers } from '@tourose/shared';

import { Chip } from '@/components/ui/Chip';
import { fetchPublicPlaces, fetchUpcomingEvents } from '@/src/data/catalog-api';
import { formatDistanceLabel, placeTypeLabel } from '@/src/domain/place-labels';
import { getUserCoordinatesOrToulouse } from '@/src/lib/location';
import { MAP_HTML } from '@/src/lib/map-html';

type MapSegment = 'all' | 'events' | 'places';

type MapPin = {
  id: string;
  kind: 'event' | 'place';
  slug: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  isFree: boolean;
  /** Date de l'événement pour le pin mini-calendrier (jour + mois abrégé). */
  dayLabel?: string;
  monthLabel?: string;
};

const TOULOUSE_CENTER = { latitude: 43.6045, longitude: 1.444 };
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 10;
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.76);
const CARD_SIDE_PADDING = Math.round((SCREEN_WIDTH - CARD_WIDTH) / 2);

function buildPins(
  events: PublicEventRow[],
  places: PublicPlaceRow[],
  segment: MapSegment,
  freeOnly: boolean,
): MapPin[] {
  const eventPins: MapPin[] = events
    .filter((eventRow) => eventRow.latitude != null && eventRow.longitude != null)
    .map((eventRow) => {
      const startDate = eventRow.next_starts_at ? new Date(eventRow.next_starts_at) : null;
      return {
        id: `event-${eventRow.id}`,
        kind: 'event' as const,
        slug: eventRow.slug,
        title: eventRow.title,
        subtitle: startDate
          ? startDate.toLocaleString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Événement',
        latitude: eventRow.latitude as number,
        longitude: eventRow.longitude as number,
        imageUrl: eventRow.image_url ?? null,
        isFree: eventRow.price_type === 'free',
        dayLabel: startDate ? String(startDate.getDate()) : undefined,
        monthLabel: startDate
          ? startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
          : undefined,
      };
    });

  const placePins: MapPin[] = places
    .filter((placeRow) => placeRow.latitude != null && placeRow.longitude != null)
    .map((placeRow) => ({
      id: `place-${placeRow.id}`,
      kind: 'place' as const,
      slug: placeRow.slug,
      title: placeRow.name,
      subtitle: placeTypeLabel(placeRow.place_type),
      latitude: placeRow.latitude as number,
      longitude: placeRow.longitude as number,
      imageUrl: placeRow.image_url ?? null,
      isFree: placeRow.price_type === 'free',
    }));

  let pins: MapPin[] = [];
  if (segment === 'all' || segment === 'events') pins = pins.concat(eventPins);
  if (segment === 'all' || segment === 'places') pins = pins.concat(placePins);
  if (freeOnly) pins = pins.filter((pin) => pin.isFree);

  // Dédoublonne les pins superposés (même lieu pour plusieurs événements)
  // pour garder une carte lisible.
  const seenCoordinates = new Set<string>();
  return pins
    .filter((pin) => {
      const coordinateKey = `${pin.kind}-${pin.latitude.toFixed(4)}-${pin.longitude.toFixed(4)}`;
      if (seenCoordinates.has(coordinateKey)) return false;
      seenCoordinates.add(coordinateKey);
      return true;
    })
    .slice(0, 60);
}

export default function MapScreen() {
  const [segment, setSegment] = useState<MapSegment>('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const carouselRef = useRef<FlatList<MapPin>>(null);
  // Évite la boucle sélection → scroll → sélection.
  const isProgrammaticScroll = useRef(false);

  const userLocationQuery = useQuery({
    queryKey: ['user-coordinates'],
    queryFn: getUserCoordinatesOrToulouse,
    staleTime: 5 * 60 * 1000,
  });

  const eventsQuery = useQuery({
    queryKey: ['catalog', 'events', 80],
    queryFn: () => fetchUpcomingEvents(80),
  });
  const placesQuery = useQuery({
    queryKey: ['catalog', 'places', 'map'],
    queryFn: () => fetchPublicPlaces({ limitCount: 60, discoveryOnly: true }),
  });

  const pins = useMemo(() => {
    const origin = userLocationQuery.data ?? TOULOUSE_CENTER;
    return buildPins(eventsQuery.data ?? [], placesQuery.data ?? [], segment, freeOnly).sort(
      (first, second) =>
        distanceInKilometers(origin.latitude, origin.longitude, first.latitude, first.longitude) -
        distanceInKilometers(origin.latitude, origin.longitude, second.latitude, second.longitude),
    );
  }, [eventsQuery.data, placesQuery.data, segment, freeOnly, userLocationQuery.data]);

  const selectedIndex = Math.max(
    0,
    pins.findIndex((pin) => pin.id === selectedPinId),
  );
  const selectedPin = pins[selectedIndex] ?? null;

  // Sélection initiale / après changement de filtre.
  useEffect(() => {
    if (pins.length === 0) {
      setSelectedPinId(null);
      return;
    }
    if (!pins.some((pin) => pin.id === selectedPinId)) {
      setSelectedPinId(pins[0].id);
    }
  }, [pins, selectedPinId]);

  // Pousse les pins dans la carte web.
  useEffect(() => {
    if (!isMapReady) return;
    const webPins = pins.map((pin) => ({
      id: pin.id,
      kind: pin.kind,
      latitude: pin.latitude,
      longitude: pin.longitude,
      dayLabel: pin.dayLabel,
      monthLabel: pin.monthLabel,
    }));
    webViewRef.current?.injectJavaScript(
      `window.__setPins(${JSON.stringify(JSON.stringify(webPins))}); true;`,
    );
  }, [pins, isMapReady]);

  // Reflète la sélection côté carte (pin rouge + recentrage).
  useEffect(() => {
    if (!isMapReady || !selectedPin) return;
    webViewRef.current?.injectJavaScript(
      `window.__selectPin(${JSON.stringify(selectedPin.id)}, ${selectedPin.latitude}, ${selectedPin.longitude}); true;`,
    );
  }, [selectedPin, isMapReady]);

  const onWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as
          | { type: 'ready' }
          | { type: 'pinPress'; id: string };
        if (message.type === 'ready') {
          setIsMapReady(true);
          return;
        }
        if (message.type === 'pinPress') {
          const pinIndex = pins.findIndex((pin) => pin.id === message.id);
          if (pinIndex >= 0) {
            setSelectedPinId(message.id);
            isProgrammaticScroll.current = true;
            carouselRef.current?.scrollToIndex({ index: pinIndex, animated: true });
          }
        }
      } catch {
        // Message inattendu : ignoré.
      }
    },
    [pins],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<MapPin>[] }) => {
      if (isProgrammaticScroll.current) return;
      const firstVisible = viewableItems[0]?.item;
      if (firstVisible) {
        setSelectedPinId(firstVisible.id);
      }
    },
  ).current;

  function recenterOnUser(): void {
    const origin = userLocationQuery.data ?? TOULOUSE_CENTER;
    webViewRef.current?.injectJavaScript(
      `window.__recenter(${origin.latitude}, ${origin.longitude}); true;`,
    );
  }

  const isLoading = eventsQuery.isLoading || placesQuery.isLoading;
  const origin = userLocationQuery.data ?? TOULOUSE_CENTER;

  return (
    <View className="flex-1 bg-sand-50">
      {/* La carte remplit tout l'écran ; l'UI se superpose dessus. */}
      <View style={StyleSheet.absoluteFillObject}>
        <WebView
          ref={webViewRef}
          testID="map-webview"
          source={{ html: MAP_HTML }}
          originWhitelist={['*']}
          onMessage={onWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          style={{ flex: 1 }}
        />
      </View>

      <SafeAreaView edges={['top']} pointerEvents="box-none" className="flex-1">
        {/* Filtres flottants */}
        <View className="flex-row flex-wrap gap-2 px-5 pt-3.5" pointerEvents="box-none">
          {(
            [
              ['all', 'Tout'],
              ['events', 'Événements'],
              ['places', 'Lieux'],
            ] as const
          ).map(([segmentKey, label]) => (
            <Chip
              key={segmentKey}
              testID={`map-segment-${segmentKey}`}
              label={label}
              selected={segment === segmentKey}
              tone={segment === segmentKey ? 'solid' : 'white'}
              onPress={() => setSegment(segmentKey)}
            />
          ))}
          <Chip
            testID="map-filter-free"
            label="Gratuit"
            selected={freeOnly}
            tone={freeOnly ? 'solid' : 'white'}
            onPress={() => setFreeOnly((previous) => !previous)}
          />
        </View>

        {isLoading || !isMapReady ? (
          <View className="mx-5 mt-3 flex-row items-center gap-2 self-start rounded-full bg-white/95 px-4 py-2">
            <ActivityIndicator size="small" color="#C45C3E" />
            <Text className="text-[13px] font-body text-ink-600">Chargement de la carte…</Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/* UI ancrée en bas de l'écran, superposée à la carte */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        {/* Bouton recentrage */}
        <Pressable
          testID="map-recenter"
          accessibilityRole="button"
          accessibilityLabel="Recentrer la carte"
          onPress={recenterOnUser}
          className="mb-3 mr-5 h-11 w-11 items-center justify-center self-end rounded-full bg-white"
          style={{
            shadowColor: '#1F1C19',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <FontAwesome name="crosshairs" size={18} color="#1F1C19" />
        </Pressable>

        {/* Carrousel horizontal des résultats */}
        {pins.length > 0 ? (
          <FlatList
            ref={carouselRef}
            testID="map-carousel"
            data={pins}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: CARD_SIDE_PADDING,
              // La tab bar opaque est déjà sous l'écran : petit padding fixe seulement.
              paddingBottom: 10,
              gap: CARD_GAP,
            }}
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH + CARD_GAP,
              offset: (CARD_WIDTH + CARD_GAP) * index,
              index,
            })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            onMomentumScrollEnd={() => {
              isProgrammaticScroll.current = false;
            }}
            renderItem={({ item }) => {
              const distanceKm = distanceInKilometers(
                origin.latitude,
                origin.longitude,
                item.latitude,
                item.longitude,
              );
              const isSelected = item.id === selectedPin?.id;
              return (
                <Pressable
                  testID={`map-card-${item.slug}`}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      (item.kind === 'event'
                        ? `/event/${item.slug}`
                        : `/place/${item.slug}`) as never,
                    )
                  }
                  className="flex-row overflow-hidden rounded-2xl bg-white"
                  style={{
                    width: CARD_WIDTH,
                    height: 76,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#E03D2E' : 'transparent',
                    shadowColor: '#1F1C19',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.12,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View className="h-full w-[76px] bg-garonne-100">
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        resizeMode="cover"
                        style={{ width: '100%', height: '100%' }}
                        accessibilityLabel={item.title}
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <FontAwesome
                          name={item.kind === 'event' ? 'calendar' : 'map-marker'}
                          size={20}
                          color="#26525C"
                        />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 justify-center px-3 py-2">
                    <Text
                      numberOfLines={1}
                      className="text-[14px] font-body-semibold text-ink-800"
                    >
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[12px] font-body text-ink-500">
                      {item.subtitle}
                    </Text>
                    <View className="mt-0.5 flex-row items-center gap-1.5">
                      <FontAwesome name="location-arrow" size={10} color="#C45C3E" />
                      <Text className="text-[11px] font-body text-brick-700">
                        {formatDistanceLabel(distanceKm)}
                      </Text>
                      {item.isFree ? (
                        <View className="rounded-full bg-garonne-100 px-1.5 py-0.5">
                          <Text className="text-[9px] font-body-semibold text-garonne-700">
                            Gratuit
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View className="items-center justify-center pr-2.5">
                    <FontAwesome name="chevron-right" size={12} color="#A39B90" />
                  </View>
                </Pressable>
              );
            }}
          />
        ) : !isLoading ? (
          <View className="mx-5 mb-3 rounded-2xl bg-white/95 px-4 py-3">
            <Text className="text-[13px] font-body text-ink-600">
              Aucun point géolocalisé pour ces filtres.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
