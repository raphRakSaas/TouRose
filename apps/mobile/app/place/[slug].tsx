import { FontAwesome } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { MarkdownLite } from '@/components/ui/MarkdownLite';
import { fetchPlaceMedia, fetchPublicPlaceBySlug } from '@/src/data/catalog-api';
import { isFavorite, isVisited, toggleFavorite, toggleVisited } from '@/src/data/local-catalog';
import { openDirections } from '@/src/lib/directions';
import { buildPublicCatalogUrl } from '@/src/lib/public-urls';

const PLACE_TYPE_LABELS: Record<string, string> = {
  monument: 'Monument',
  museum: 'Musée',
  square: 'Place',
  park: 'Parc',
  walk: 'Balade',
  viewpoint: 'Point de vue',
  activity: 'Activité',
  cultural_venue: 'Lieu culturel',
  historical_site: 'Site historique',
  permanent_tip: 'Bon plan permanent',
};

const PRICE_LABELS: Record<string, string> = {
  free: 'Gratuit',
  paid: 'Payant',
  donation: 'Prix libre',
  unknown: 'Prix non communiqué',
};

function formatDuration(durationMinutes: number | null | undefined): string | null {
  if (!durationMinutes) return null;
  if (durationMinutes < 60) return `${durationMinutes} min`;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes}` : `${hours} h`;
}

export default function PlaceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const placeSlug = typeof slug === 'string' ? slug : '';
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isFavoriteState, setIsFavoriteState] = useState(false);
  const [isVisitedState, setIsVisitedState] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const placeQuery = useQuery({
    queryKey: ['catalog', 'place', placeSlug],
    queryFn: () => fetchPublicPlaceBySlug(placeSlug),
    enabled: placeSlug.length > 0,
  });
  const placeRow = placeQuery.data;

  const mediaQuery = useQuery({
    queryKey: ['catalog', 'place-media', placeRow?.id],
    queryFn: () => fetchPlaceMedia(placeRow?.id ?? ''),
    enabled: Boolean(placeRow?.id),
  });

  useEffect(() => {
    if (!placeRow) return;
    let cancelled = false;
    void (async () => {
      const [favorite, visited] = await Promise.all([
        isFavorite('place', placeRow.id),
        isVisited('place', placeRow.id),
      ]);
      if (!cancelled) {
        setIsFavoriteState(favorite);
        setIsVisitedState(visited);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [placeRow]);

  const mediaList = mediaQuery.data ?? [];
  const carouselImages =
    mediaList.length > 0
      ? mediaList.map((media) => ({
          uri: media.remote_url,
          alt: media.alt_text ?? placeRow?.name ?? 'Lieu',
          attribution: media.attribution_text,
        }))
      : placeRow?.image_url
        ? [
            {
              uri: placeRow.image_url,
              alt: placeRow.image_alt ?? placeRow.name,
              attribution: placeRow.image_attribution ?? null,
            },
          ]
        : [];

  const details = placeRow?.details ?? { links: [] };
  const addressLine = placeRow
    ? [placeRow.address, [placeRow.postal_code, placeRow.city].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ')
    : '';
  const directionsTarget =
    placeRow?.latitude != null && placeRow.longitude != null
      ? { latitude: placeRow.latitude, longitude: placeRow.longitude, label: placeRow.name }
      : null;
  const durationLabel = formatDuration(placeRow?.recommended_duration_minutes);
  const heroHeight = 300 + insets.top;
  const bottomBarHeight = 64 + Math.max(insets.bottom, 12);
  const attribution = carouselImages[carouselIndex]?.attribution;

  function onCarouselScroll(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    const pageIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    if (pageIndex >= 0 && pageIndex < carouselImages.length) {
      setCarouselIndex(pageIndex);
    }
  }

  async function onToggleFavorite(): Promise<void> {
    if (!placeRow) return;
    const nextValue = await toggleFavorite({
      entityType: 'place',
      entityId: placeRow.id,
      slug: placeRow.slug,
      title: placeRow.name,
      subtitle: `${PLACE_TYPE_LABELS[placeRow.place_type] ?? placeRow.place_type} · ${placeRow.city ?? 'Toulouse'}`,
    });
    setIsFavoriteState(nextValue);
  }

  async function onToggleVisited(): Promise<void> {
    if (!placeRow) return;
    const nextValue = await toggleVisited({
      entityType: 'place',
      entityId: placeRow.id,
      slug: placeRow.slug,
      title: placeRow.name,
      subtitle: `${PLACE_TYPE_LABELS[placeRow.place_type] ?? placeRow.place_type} · ${placeRow.city ?? 'Toulouse'}`,
    });
    setIsVisitedState(nextValue);
  }

  async function onShare(): Promise<void> {
    if (!placeRow) return;
    const url = buildPublicCatalogUrl('place', placeRow.slug);
    await Share.share({ title: placeRow.name, message: `${placeRow.name}\n${url}`, url });
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <View className="flex-1 bg-sand-50">
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: placeRow ? bottomBarHeight + 24 : 40 }}
          refreshControl={
            <RefreshControl
              refreshing={placeQuery.isRefetching}
              onRefresh={() => void placeQuery.refetch()}
              tintColor="#C45C3E"
            />
          }
        >
          <View style={{ height: heroHeight }}>
            {carouselImages.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onCarouselScroll}
                  testID="place-carousel"
                >
                  {carouselImages.map((image, imageIndex) => (
                    <View
                      key={`${image.uri}-${imageIndex}`}
                      style={{ width: screenWidth, height: heroHeight, overflow: 'hidden' }}
                    >
                      <Image
                        source={{ uri: image.uri }}
                        resizeMode="cover"
                        blurRadius={22}
                        style={{ position: 'absolute', width: '100%', height: '100%' }}
                      />
                      <View
                        className="absolute inset-0"
                        style={{ backgroundColor: 'rgba(31,28,25,0.25)' }}
                      />
                      <Image
                        source={{ uri: image.uri }}
                        accessibilityLabel={image.alt}
                        resizeMode="contain"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </View>
                  ))}
                </ScrollView>
                {carouselImages.length > 1 ? (
                  <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
                    {carouselImages.map((image, dotIndex) => (
                      <View
                        key={`${image.uri}-dot`}
                        className="h-1.5 rounded-full"
                        style={{
                          width: dotIndex === carouselIndex ? 18 : 6,
                          backgroundColor:
                            dotIndex === carouselIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                        }}
                      />
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <ImagePlaceholder
                label={placeRow?.name ?? 'Lieu'}
                width={screenWidth}
                height={heroHeight}
              />
            )}
          </View>

          {placeQuery.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#C45C3E" />
            </View>
          ) : null}

          {placeQuery.error ? (
            <View className="gap-2 px-5 pt-5">
              <Text className="text-base font-body-semibold text-brick-700">
                Impossible de charger
              </Text>
              <Text className="text-sm font-body text-ink-500">{placeQuery.error.message}</Text>
            </View>
          ) : null}

          {!placeQuery.isLoading && !placeQuery.error && !placeRow ? (
            <Text className="px-5 pt-5 text-sm font-body text-ink-500">
              Lieu introuvable ou non publié.
            </Text>
          ) : null}

          {placeRow ? (
            <View className="-mt-5 rounded-t-[24px] bg-sand-50 px-[22px] pt-6">
              <View className="mb-3 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-teal-700/10 px-3 py-1">
                  <Text className="text-[11px] font-body-semibold text-teal-700">
                    {PLACE_TYPE_LABELS[placeRow.place_type] ?? placeRow.place_type}
                  </Text>
                </View>
                <View
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor: placeRow.price_type === 'free' ? '#3F7E5222' : '#1F1C1911',
                  }}
                >
                  <Text
                    className="text-[11px] font-body-semibold"
                    style={{ color: placeRow.price_type === 'free' ? '#3F7E52' : '#4A443E' }}
                  >
                    {PRICE_LABELS[placeRow.price_type] ?? placeRow.price_type}
                  </Text>
                </View>
              </View>

              <Text className="mb-4 font-display text-[24px] leading-[1.2] text-ink-800">
                {placeRow.name}
              </Text>

              <View className="mb-4 gap-3 rounded-[18px] bg-white p-4">
                {addressLine ? (
                  <Pressable
                    testID="place-address"
                    accessibilityRole="button"
                    disabled={!directionsTarget}
                    onPress={() => {
                      if (directionsTarget) openDirections(directionsTarget);
                    }}
                    className="flex-row items-center gap-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-teal-700/10">
                      <FontAwesome name="map-marker" size={19} color="#26525C" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[14px] font-body-semibold text-ink-800">
                        {addressLine}
                      </Text>
                      {directionsTarget ? (
                        <Text className="mt-0.5 text-[12px] font-body-semibold text-teal-700">
                          Itinéraire (Plans, Google Maps, Waze)
                        </Text>
                      ) : null}
                    </View>
                    {directionsTarget ? (
                      <FontAwesome name="chevron-right" size={13} color="#9C948A" />
                    ) : null}
                  </Pressable>
                ) : null}

                {durationLabel ? (
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-brick-500/10">
                      <FontAwesome name="clock-o" size={18} color="#C45C3E" />
                    </View>
                    <Text className="flex-1 text-[14px] font-body text-ink-800">
                      Durée conseillée : {durationLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="mb-5 flex-row gap-2.5">
                <Pressable
                  testID="place-favorite"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFavoriteState }}
                  onPress={() => void onToggleFavorite()}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-brick-500 py-2.5"
                  style={{ backgroundColor: isFavoriteState ? '#C45C3E' : 'transparent' }}
                >
                  <FontAwesome
                    name={isFavoriteState ? 'heart' : 'heart-o'}
                    size={14}
                    color={isFavoriteState ? '#FFFFFF' : '#A94A30'}
                  />
                  <Text
                    className={`text-[13px] font-body-semibold ${isFavoriteState ? 'text-white' : 'text-brick-700'}`}
                  >
                    Favori
                  </Text>
                </Pressable>
                <Pressable
                  testID="place-visited"
                  accessibilityRole="button"
                  accessibilityState={{ selected: isVisitedState }}
                  onPress={() => void onToggleVisited()}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-teal-700 py-2.5"
                  style={{ backgroundColor: isVisitedState ? '#26525C' : 'transparent' }}
                >
                  <FontAwesome
                    name="check"
                    size={14}
                    color={isVisitedState ? '#FFFFFF' : '#26525C'}
                  />
                  <Text
                    className={`text-[13px] font-body-semibold ${isVisitedState ? 'text-white' : 'text-teal-700'}`}
                  >
                    Visité
                  </Text>
                </Pressable>
                <Pressable
                  testID="place-share"
                  accessibilityRole="button"
                  onPress={() => void onShare()}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-sand-200 bg-white py-2.5"
                >
                  <FontAwesome name="share-alt" size={14} color="#4A443E" />
                  <Text className="text-[13px] font-body-semibold text-ink-800">Partager</Text>
                </Pressable>
              </View>

              <Text className="mb-2 font-display text-[17px] text-ink-800">À propos</Text>
              {placeRow.description || placeRow.summary ? (
                <MarkdownLite content={placeRow.description ?? placeRow.summary ?? ''} />
              ) : (
                <Text className="text-[15px] leading-[1.7] font-body text-ink-500">
                  La description détaillée de ce lieu n’est pas encore disponible.
                </Text>
              )}

              {details.access ? (
                <View className="mt-6">
                  <Text className="mb-2 font-display text-[17px] text-ink-800">Accès</Text>
                  <View className="flex-row gap-3 rounded-[18px] bg-white p-4">
                    <FontAwesome name="subway" size={16} color="#26525C" style={{ marginTop: 3 }} />
                    <Text className="flex-1 text-[14px] leading-[1.6] font-body text-ink-800">
                      {details.access}
                    </Text>
                  </View>
                </View>
              ) : null}

              {details.best_moment || details.tips.length > 0 ? (
                <View className="mt-6">
                  <Text className="mb-2 font-display text-[17px] text-ink-800">Conseils TouRose</Text>
                  <View className="gap-3 rounded-[18px] bg-white p-4">
                    {details.best_moment ? (
                      <View className="flex-row gap-3">
                        <FontAwesome name="clock-o" size={16} color="#A94A30" style={{ marginTop: 3 }} />
                        <View className="flex-1">
                          <Text className="mb-0.5 text-[13px] font-body-semibold text-ink-500">
                            Meilleur moment
                          </Text>
                          <Text className="text-[14px] leading-[1.6] font-body text-ink-800">
                            {details.best_moment}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                    {details.tips.map((tip) => (
                      <View key={tip} className="flex-row gap-3">
                        <FontAwesome name="lightbulb-o" size={16} color="#A88B63" style={{ marginTop: 3 }} />
                        <Text className="flex-1 text-[14px] leading-[1.6] font-body text-ink-800">
                          {tip}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {placeRow.price_details ||
              placeRow.family_friendly != null ||
              placeRow.dog_friendly != null ||
              placeRow.accessible != null ? (
                <View className="mt-6">
                  <Text className="mb-2 font-display text-[17px] text-ink-800">
                    Bon à savoir
                  </Text>
                  <View className="gap-3 rounded-[18px] bg-white p-4">
                    {placeRow.price_details ? (
                      <View className="flex-row gap-3">
                        <FontAwesome name="tag" size={15} color="#A94A30" style={{ marginTop: 3 }} />
                        <Text className="flex-1 text-[14px] leading-[1.6] font-body text-ink-800">
                          {placeRow.price_details}
                        </Text>
                      </View>
                    ) : null}
                    {placeRow.family_friendly != null ? (
                      <View className="flex-row items-center gap-3">
                        <FontAwesome name="child" size={16} color="#26525C" />
                        <Text className="text-[14px] font-body text-ink-800">
                          {placeRow.family_friendly ? 'Adapté aux familles' : 'Non indiqué pour les familles'}
                        </Text>
                      </View>
                    ) : null}
                    {placeRow.accessible != null ? (
                      <View className="flex-row items-center gap-3">
                        <FontAwesome name="wheelchair" size={15} color="#3F7E52" />
                        <Text className="text-[14px] font-body text-ink-800">
                          {placeRow.accessible
                            ? 'Accessible aux personnes à mobilité réduite'
                            : 'Accessibilité non garantie'}
                        </Text>
                      </View>
                    ) : null}
                    {placeRow.dog_friendly != null ? (
                      <View className="flex-row items-center gap-3">
                        <FontAwesome name="paw" size={15} color="#A88B63" />
                        <Text className="text-[14px] font-body text-ink-800">
                          {placeRow.dog_friendly ? 'Chiens acceptés' : 'Chiens non indiqués comme acceptés'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {placeRow.phone || details.email || details.links.length > 0 ? (
                <View className="mt-6">
                  <Text className="mb-2 font-display text-[17px] text-ink-800">
                    Contact & liens
                  </Text>
                  <View className="gap-1 rounded-[18px] bg-white p-2">
                    {placeRow.phone ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void Linking.openURL(`tel:${placeRow.phone?.replace(/\s+/g, '')}`)}
                        className="flex-row items-center gap-3 rounded-[12px] px-3 py-2.5"
                      >
                        <FontAwesome name="phone" size={15} color="#A94A30" />
                        <Text className="flex-1 text-[14px] font-body-semibold text-ink-800">
                          {placeRow.phone}
                        </Text>
                      </Pressable>
                    ) : null}
                    {details.email ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void Linking.openURL(`mailto:${details.email}`)}
                        className="flex-row items-center gap-3 rounded-[12px] px-3 py-2.5"
                      >
                        <FontAwesome name="envelope-o" size={15} color="#A94A30" />
                        <Text className="flex-1 text-[14px] font-body-semibold text-ink-800">
                          {details.email}
                        </Text>
                      </Pressable>
                    ) : null}
                    {details.links.map((link) => (
                      <Pressable
                        key={link.url}
                        accessibilityRole="link"
                        onPress={() => void WebBrowser.openBrowserAsync(link.url)}
                        className="flex-row items-center gap-3 rounded-[12px] px-3 py-2.5"
                      >
                        <FontAwesome name="external-link" size={15} color="#A94A30" />
                        <Text className="flex-1 text-[14px] font-body-semibold text-ink-800">
                          {link.label || 'Lien utile'}
                        </Text>
                        <FontAwesome name="chevron-right" size={12} color="#9C948A" />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {attribution ? (
                <Text className="mt-5 text-[11px] font-body text-ink-300">
                  {attribution}
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <Pressable
          testID="place-back"
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          className="absolute items-center justify-center rounded-full"
          style={{
            top: insets.top + 8,
            left: 16,
            width: 38,
            height: 38,
            backgroundColor: 'rgba(31,28,25,0.45)',
          }}
        >
          <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
        </Pressable>

        {placeRow ? (
          <View
            className="absolute bottom-0 w-full flex-row gap-2.5 border-t border-sand-200 bg-sand-50 px-[22px] pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            {directionsTarget ? (
              <Pressable
                testID="place-cta-directions"
                accessibilityRole="button"
                onPress={() => openDirections(directionsTarget)}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-brick-500 py-3.5"
              >
                <FontAwesome name="location-arrow" size={15} color="#FFFFFF" />
                <Text className="text-[15px] font-body-semibold text-white">Y aller</Text>
              </Pressable>
            ) : null}
            {placeRow.website_url ? (
              <Pressable
                testID="place-cta-website"
                accessibilityRole="link"
                onPress={() => {
                  if (placeRow.website_url) {
                    void WebBrowser.openBrowserAsync(placeRow.website_url);
                  }
                }}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-[16px] py-3.5 ${
                  directionsTarget ? 'border-[1.5px] border-brick-500 bg-white' : 'bg-brick-500'
                }`}
              >
                <FontAwesome
                  name="external-link"
                  size={15}
                  color={directionsTarget ? '#A94A30' : '#FFFFFF'}
                />
                <Text
                  className={`text-[15px] font-body-semibold ${
                    directionsTarget ? 'text-brick-700' : 'text-white'
                  }`}
                >
                  Site officiel
                </Text>
              </Pressable>
            ) : null}
            {!directionsTarget && !placeRow.website_url ? (
              <Pressable
                testID="place-cta-share"
                accessibilityRole="button"
                onPress={() => void onShare()}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-brick-500 py-3.5"
              >
                <FontAwesome name="share-alt" size={15} color="#FFFFFF" />
                <Text className="text-[15px] font-body-semibold text-white">Partager</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );
}
