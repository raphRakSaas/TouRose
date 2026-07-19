import { FontAwesome } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';

import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { MarkdownLite } from '@/components/ui/MarkdownLite';
import {
  fetchEventMedia,
  fetchPublicEventBySlug,
  fetchPublicPlaceById,
} from '@/src/data/catalog-api';
import { isFavorite, toggleFavorite } from '@/src/data/local-catalog';
import { EVENT_CATEGORIES } from '@/src/domain/today-feed';
import { addEventToCalendar } from '@/src/lib/calendar';
import { openDirections } from '@/src/lib/directions';
import { buildPublicCatalogUrl } from '@/src/lib/public-urls';

const CATEGORY_META = new Map(EVENT_CATEGORIES.map((category) => [category.slug, category]));

const PRICE_LABELS: Record<string, string> = {
  free: 'Gratuit',
  paid: 'Payant',
  donation: 'Prix libre',
  unknown: 'Prix non communiqué',
};

const SETTING_LABELS: Record<string, string> = {
  indoor: 'En intérieur',
  outdoor: 'En plein air',
  mixed: 'Intérieur & extérieur',
  unknown: '',
};

const ACCESSIBILITY_LABELS: Record<string, string> = {
  hi: 'Accessible aux personnes malentendantes',
  ii: 'Accessible handicap intellectuel',
  mi: 'Accessible aux personnes à mobilité réduite',
  pi: 'Accessible handicap psychique',
  vi: 'Accessible aux personnes malvoyantes',
};

const REGISTRATION_ICONS: Record<string, ComponentProps<typeof FontAwesome>['name']> = {
  link: 'external-link',
  phone: 'phone',
  email: 'envelope-o',
};

function formatAgeLabel(ageMin?: number | null, ageMax?: number | null): string | null {
  const hasMin = typeof ageMin === 'number' && ageMin > 0;
  const hasMax = typeof ageMax === 'number' && ageMax > 0 && ageMax < 99;
  if (hasMin && hasMax) {
    return `De ${ageMin} à ${ageMax} ans`;
  }
  if (hasMin) {
    return `À partir de ${ageMin} ans`;
  }
  if (hasMax) {
    return `Jusqu’à ${ageMax} ans`;
  }
  return null;
}

async function openRegistrationEntry(entry: { type: string; value: string }): Promise<void> {
  if (entry.type === 'phone') {
    await Linking.openURL(`tel:${entry.value.replace(/\s+/g, '')}`);
    return;
  }
  if (entry.type === 'email') {
    await Linking.openURL(`mailto:${entry.value}`);
    return;
  }
  if (entry.value.startsWith('http://') || entry.value.startsWith('https://')) {
    await WebBrowser.openBrowserAsync(entry.value);
  }
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatEventSchedule(startsAt: string | null, endsAt: string | null): {
  dateLabel: string;
  timeLabel: string;
} | null {
  if (!startsAt) {
    return null;
  }
  const startDate = new Date(startsAt);
  const dateLabel = capitalizeFirst(
    startDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  );
  const startTime = startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  let timeLabel = startTime;
  if (endsAt) {
    const endDate = new Date(endsAt);
    const endTime = endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    timeLabel = `${startTime} – ${endTime}`;
  }
  return { dateLabel, timeLabel };
}

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const eventSlug = typeof slug === 'string' ? slug : '';
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isFavoriteState, setIsFavoriteState] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  const eventQuery = useQuery({
    queryKey: ['catalog', 'event', eventSlug],
    queryFn: () => fetchPublicEventBySlug(eventSlug),
    enabled: eventSlug.length > 0,
  });

  const eventRow = eventQuery.data;

  const mediaQuery = useQuery({
    queryKey: ['catalog', 'event-media', eventRow?.id],
    queryFn: () => fetchEventMedia(eventRow?.id ?? ''),
    enabled: Boolean(eventRow?.id),
  });

  const placeQuery = useQuery({
    queryKey: ['catalog', 'place-by-id', eventRow?.place_id],
    queryFn: () => fetchPublicPlaceById(eventRow?.place_id ?? ''),
    enabled: Boolean(eventRow?.place_id),
  });

  const placeRow = placeQuery.data ?? null;

  useEffect(() => {
    if (!eventRow) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const favorite = await isFavorite('event', eventRow.id);
      if (!cancelled) {
        setIsFavoriteState(favorite);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventRow]);

  const mediaList = mediaQuery.data ?? [];
  const carouselImages =
    mediaList.length > 0
      ? mediaList.map((media) => ({
          uri: media.remote_url,
          alt: media.alt_text ?? eventRow?.title ?? 'Événement',
          attribution: media.attribution_text,
        }))
      : eventRow?.image_url
        ? [
            {
              uri: eventRow.image_url,
              alt: eventRow.image_alt ?? eventRow.title,
              attribution: eventRow.image_attribution ?? null,
            },
          ]
        : [];

  const schedule = eventRow
    ? formatEventSchedule(eventRow.next_starts_at, eventRow.next_ends_at)
    : null;

  const directionsTarget = (() => {
    const latitude = eventRow?.latitude ?? placeRow?.latitude ?? null;
    const longitude = eventRow?.longitude ?? placeRow?.longitude ?? null;
    if (latitude == null || longitude == null) {
      return null;
    }
    return {
      latitude,
      longitude,
      label: placeRow?.name ?? eventRow?.title,
    };
  })();

  const addressLine = [placeRow?.address, placeRow?.city ?? 'Toulouse']
    .filter((part): part is string => Boolean(part))
    .join(', ');

  const categoryBadges = (eventRow?.categories ?? [])
    .map((categorySlug) => CATEGORY_META.get(categorySlug as (typeof EVENT_CATEGORIES)[number]['slug']))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  const description = eventRow?.description?.trim() || eventRow?.summary?.trim() || null;
  const attribution = carouselImages[carouselIndex]?.attribution ?? null;

  const eventDetails = eventRow?.details ?? {};
  const upcomingOccurrences = eventRow?.upcoming_occurrences ?? [];
  const keywords = eventDetails.keywords ?? [];
  const registrationEntries = eventDetails.registration ?? [];
  const accessibilityLabels = (eventDetails.accessibility ?? [])
    .map((code) => ACCESSIBILITY_LABELS[code])
    .filter((label): label is string => Boolean(label));
  const ageLabel = formatAgeLabel(eventDetails.age_min, eventDetails.age_max);
  const onlineLabel =
    eventDetails.attendance_mode === 'online'
      ? 'Événement en ligne'
      : eventDetails.attendance_mode === 'mixed'
        ? 'Sur place et en ligne'
        : eventDetails.online_access_link
          ? 'Accès en ligne disponible'
          : null;

  function onCarouselScroll(scrollEvent: NativeSyntheticEvent<NativeScrollEvent>): void {
    const pageIndex = Math.round(scrollEvent.nativeEvent.contentOffset.x / screenWidth);
    if (pageIndex !== carouselIndex && pageIndex >= 0 && pageIndex < carouselImages.length) {
      setCarouselIndex(pageIndex);
    }
  }

  async function onToggleFavorite(): Promise<void> {
    if (!eventRow || isTogglingFavorite) {
      return;
    }
    setIsTogglingFavorite(true);
    try {
      const nextValue = await toggleFavorite({
        entityType: 'event',
        entityId: eventRow.id,
        slug: eventRow.slug,
        title: eventRow.title,
        subtitle: eventRow.price_type,
      });
      setIsFavoriteState(nextValue);
    } finally {
      setIsTogglingFavorite(false);
    }
  }

  async function onShare(): Promise<void> {
    if (!eventRow) {
      return;
    }
    const url = buildPublicCatalogUrl('event', eventRow.slug);
    await Share.share({
      title: eventRow.title,
      message: `${eventRow.title}\n${url}`,
      url,
    });
  }

  async function onOpenOfficial(): Promise<void> {
    if (!eventRow?.official_url) {
      Alert.alert('Lien indisponible', 'Aucun lien officiel pour cet événement.');
      return;
    }
    await WebBrowser.openBrowserAsync(eventRow.official_url);
  }

  async function onAddToCalendar(): Promise<void> {
    if (!eventRow) {
      return;
    }
    try {
      await addEventToCalendar({
        title: eventRow.title,
        startsAt: eventRow.next_starts_at,
        endsAt: eventRow.next_ends_at,
        notes: eventRow.summary,
        url: buildPublicCatalogUrl('event', eventRow.slug),
      });
      Alert.alert('Ajouté', 'L’événement a été ajouté à ton calendrier.');
    } catch (calendarError) {
      Alert.alert(
        'Calendrier',
        calendarError instanceof Error ? calendarError.message : 'Impossible d’ajouter au calendrier.',
      );
    }
  }

  const bottomBarHeight = 64 + Math.max(insets.bottom, 12);
  // La photo monte jusque sous la barre de statut : hauteur de base + safe area.
  const heroHeight = 300 + insets.top;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <View className="flex-1 bg-sand-50">
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{ paddingBottom: eventRow ? bottomBarHeight + 24 : 40 }}
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
          {/* Carrousel photos (plein écran jusqu'à la barre de statut) */}
          <View style={{ height: heroHeight }}>
            {carouselImages.length > 0 ? (
              <>
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onCarouselScroll}
                  testID="event-carousel"
                >
                  {carouselImages.map((image, imageIndex) => (
                    <View
                      key={`${image.uri}-${imageIndex}`}
                      style={{ width: screenWidth, height: heroHeight, overflow: 'hidden' }}
                    >
                      {/* Fond flouté (même photo) pour remplir sans rogner l'image principale */}
                      <Image
                        source={{ uri: image.uri }}
                        resizeMode="cover"
                        blurRadius={22}
                        style={{ position: 'absolute', width: '100%', height: '100%' }}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(31,28,25,0.25)',
                        }}
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
                    {carouselImages.map((_, dotIndex) => (
                      <View
                        key={dotIndex}
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
                label={eventRow?.title ?? 'Événement'}
                width={screenWidth}
                height={heroHeight}
              />
            )}
          </View>

          {eventQuery.isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#C45C3E" />
            </View>
          ) : null}

          {eventQuery.error ? (
            <View className="gap-2 px-5 pt-5">
              <Text className="text-base font-body-semibold text-brick-700">
                Impossible de charger
              </Text>
              <Text className="text-sm font-body text-ink-500">{eventQuery.error.message}</Text>
            </View>
          ) : null}

          {!eventQuery.isLoading && !eventQuery.error && !eventRow ? (
            <Text className="px-5 pt-5 text-sm font-body text-ink-500">
              Événement introuvable ou non publié.
            </Text>
          ) : null}

          {eventRow ? (
            <View className="-mt-5 rounded-t-[24px] bg-sand-50 px-[22px] pt-6">
              {/* Badges catégories + prix */}
              <View className="mb-3 flex-row flex-wrap gap-2">
                {categoryBadges.map((category) => (
                  <View
                    key={category.slug}
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: `${category.color}22` }}
                  >
                    <Text
                      className="text-[11px] font-body-semibold"
                      style={{ color: category.color }}
                    >
                      {category.label}
                    </Text>
                  </View>
                ))}
                <View
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor: eventRow.price_type === 'free' ? '#3F7E5222' : '#1F1C1911',
                  }}
                >
                  <Text
                    className="text-[11px] font-body-semibold"
                    style={{ color: eventRow.price_type === 'free' ? '#3F7E52' : '#4A443E' }}
                  >
                    {PRICE_LABELS[eventRow.price_type] ?? eventRow.price_type}
                  </Text>
                </View>
              </View>

              <Text className="mb-4 font-display text-[24px] leading-[1.2] text-ink-800">
                {eventRow.title}
              </Text>

              {/* Infos clés */}
              <View className="mb-4 gap-3 rounded-[18px] bg-white p-4">
                {schedule ? (
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-brick-500/10">
                      <FontAwesome name="calendar" size={17} color="#C45C3E" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-body-semibold text-ink-800">
                        {schedule.dateLabel}
                      </Text>
                      <Text className="text-[13px] font-body text-ink-500">
                        {schedule.timeLabel}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-brick-500/10">
                      <FontAwesome name="calendar" size={17} color="#C45C3E" />
                    </View>
                    <Text className="flex-1 text-[13px] font-body text-ink-500">
                      Date à confirmer — consulte le lien officiel.
                    </Text>
                  </View>
                )}

                {placeRow || directionsTarget ? (
                  <Pressable
                    testID="event-address"
                    accessibilityRole="button"
                    accessibilityLabel="Ouvrir l’itinéraire"
                    disabled={!directionsTarget}
                    onPress={() => {
                      if (directionsTarget) {
                        openDirections(directionsTarget);
                      }
                    }}
                    className="flex-row items-center gap-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-teal-700/10">
                      <FontAwesome name="map-marker" size={19} color="#26525C" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-body-semibold text-ink-800">
                        {placeRow?.name ?? 'Lieu de l’événement'}
                      </Text>
                      {addressLine ? (
                        <Text className="text-[13px] font-body text-ink-500">{addressLine}</Text>
                      ) : null}
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

                {SETTING_LABELS[eventRow.indoor_outdoor] ? (
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-honey-500/10">
                      <FontAwesome name="sun-o" size={17} color="#A88B63" />
                    </View>
                    <Text className="flex-1 text-[15px] font-body text-ink-800">
                      {SETTING_LABELS[eventRow.indoor_outdoor]}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Actions secondaires */}
              <View className="mb-5 flex-row gap-2.5">
                <Pressable
                  testID="event-favorite"
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
                    className={`text-[13px] font-body-semibold ${
                      isFavoriteState ? 'text-white' : 'text-brick-700'
                    }`}
                  >
                    Favori
                  </Text>
                </Pressable>
                <Pressable
                  testID="event-calendar"
                  accessibilityRole="button"
                  onPress={() => void onAddToCalendar()}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-sand-200 bg-white py-2.5"
                >
                  <FontAwesome name="calendar-plus-o" size={14} color="#4A443E" />
                  <Text className="text-[13px] font-body-semibold text-ink-800">Agenda</Text>
                </Pressable>
                <Pressable
                  testID="event-share"
                  accessibilityRole="button"
                  onPress={() => void onShare()}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-sand-200 bg-white py-2.5"
                >
                  <FontAwesome name="share-alt" size={14} color="#4A443E" />
                  <Text className="text-[13px] font-body-semibold text-ink-800">Partager</Text>
                </Pressable>
              </View>

              {/* Description */}
              <Text className="mb-2 font-display text-[17px] text-ink-800">À propos</Text>
              {description ? (
                <MarkdownLite content={description} />
              ) : (
                <Text className="text-[15px] leading-[1.7] font-body text-ink-800">
                  Pas encore de description pour cet événement.
                </Text>
              )}

              {/* Prochaines dates */}
              {upcomingOccurrences.length > 1 ? (
                <View className="mt-6">
                  <Text className="mb-2 font-display text-[17px] text-ink-800">
                    Prochaines dates
                  </Text>
                  <View className="gap-2 rounded-[18px] bg-white p-4">
                    {upcomingOccurrences.slice(0, 6).map((occurrence, occurrenceIndex) => {
                      const occurrenceSchedule = formatEventSchedule(
                        occurrence.starts_at,
                        occurrence.ends_at,
                      );
                      if (!occurrenceSchedule) {
                        return null;
                      }
                      return (
                        <View key={occurrenceIndex} className="flex-row items-center gap-2.5">
                          <View className="h-1.5 w-1.5 rounded-full bg-brick-500" />
                          <Text className="flex-1 text-[14px] font-body text-ink-800">
                            {occurrenceSchedule.dateLabel}
                          </Text>
                          <Text className="text-[13px] font-body text-ink-500">
                            {occurrenceSchedule.timeLabel}
                          </Text>
                        </View>
                      );
                    })}
                    {upcomingOccurrences.length > 6 ? (
                      <Text className="text-[12px] font-body text-ink-500">
                        + {upcomingOccurrences.length - 6} autres dates
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Infos pratiques */}
              {eventDetails.conditions || ageLabel || accessibilityLabels.length > 0 || onlineLabel ? (
                <View className="mt-6">
                  <Text className="mb-2 font-display text-[17px] text-ink-800">
                    Infos pratiques
                  </Text>
                  <View className="gap-3 rounded-[18px] bg-white p-4">
                    {eventDetails.conditions ? (
                      <View className="flex-row gap-3">
                        <FontAwesome name="tag" size={15} color="#A94A30" style={{ marginTop: 3 }} />
                        <View className="flex-1">
                          <Text className="mb-0.5 text-[13px] font-body-semibold text-ink-500">
                            Tarifs & conditions
                          </Text>
                          <Text className="text-[14px] leading-[1.6] font-body text-ink-800">
                            {eventDetails.conditions}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                    {ageLabel ? (
                      <View className="flex-row items-center gap-3">
                        <FontAwesome name="child" size={16} color="#26525C" />
                        <Text className="flex-1 text-[14px] font-body text-ink-800">{ageLabel}</Text>
                      </View>
                    ) : null}
                    {onlineLabel ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={!eventDetails.online_access_link}
                        onPress={() => {
                          if (eventDetails.online_access_link) {
                            void WebBrowser.openBrowserAsync(eventDetails.online_access_link);
                          }
                        }}
                        className="flex-row items-center gap-3"
                      >
                        <FontAwesome name="video-camera" size={14} color="#8B5EAD" />
                        <Text
                          className={`flex-1 text-[14px] font-body ${
                            eventDetails.online_access_link
                              ? 'font-body-semibold text-brick-700 underline'
                              : 'text-ink-800'
                          }`}
                        >
                          {onlineLabel}
                        </Text>
                      </Pressable>
                    ) : null}
                    {accessibilityLabels.map((label) => (
                      <View key={label} className="flex-row items-center gap-3">
                        <FontAwesome name="wheelchair" size={15} color="#3F7E52" />
                        <Text className="flex-1 text-[14px] font-body text-ink-800">{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Réservation & contact */}
              {registrationEntries.length > 0 ? (
                <View className="mt-6">
                  <Text className="mb-2 font-display text-[17px] text-ink-800">
                    Réservation & contact
                  </Text>
                  <View className="gap-1 rounded-[18px] bg-white p-2">
                    {registrationEntries.map((entry, entryIndex) => (
                      <Pressable
                        key={`${entry.type}-${entryIndex}`}
                        accessibilityRole="button"
                        onPress={() => void openRegistrationEntry(entry)}
                        className="flex-row items-center gap-3 rounded-[12px] px-3 py-2.5 active:bg-sand-100"
                      >
                        <FontAwesome
                          name={REGISTRATION_ICONS[entry.type] ?? 'external-link'}
                          size={15}
                          color="#A94A30"
                        />
                        <Text
                          className="flex-1 text-[14px] font-body-semibold text-ink-800"
                          numberOfLines={1}
                        >
                          {entry.value}
                        </Text>
                        <FontAwesome name="chevron-right" size={12} color="#9C948A" />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Mots-clés */}
              {keywords.length > 0 ? (
                <View className="mt-6 flex-row flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <View key={keyword} className="rounded-full bg-sand-200/60 px-3 py-1">
                      <Text className="text-[12px] font-body text-ink-500">#{keyword}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {attribution ? (
                <Text className="mt-4 text-[11px] font-body text-ink-300">
                  Photo : {attribution}
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {/* Bouton retour flottant, superposé à la photo */}
        <Pressable
          testID="event-back"
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

        {/* CTA fixe en bas */}
        {eventRow ? (
          <View
            className="absolute bottom-0 w-full flex-row gap-2.5 border-t border-sand-200 bg-sand-50 px-[22px] pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            {directionsTarget ? (
              <Pressable
                testID="event-cta-directions"
                accessibilityRole="button"
                onPress={() => openDirections(directionsTarget)}
                className={`${eventRow.official_url ? 'flex-1' : 'flex-[2]'} flex-row items-center justify-center gap-2 rounded-[16px] bg-brick-500 py-3.5`}
              >
                <FontAwesome name="location-arrow" size={15} color="#FFFFFF" />
                <Text className="text-[15px] font-body-semibold text-white">Y aller</Text>
              </Pressable>
            ) : null}
            {eventRow.official_url ? (
              <Pressable
                testID="event-cta-booking"
                accessibilityRole="button"
                onPress={() => void onOpenOfficial()}
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-[16px] py-3.5 ${
                  directionsTarget ? 'border-[1.5px] border-brick-500 bg-white' : 'bg-brick-500'
                }`}
              >
                <FontAwesome
                  name="ticket"
                  size={15}
                  color={directionsTarget ? '#A94A30' : '#FFFFFF'}
                />
                <Text
                  className={`text-[15px] font-body-semibold ${
                    directionsTarget ? 'text-brick-700' : 'text-white'
                  }`}
                >
                  Réserver
                </Text>
              </Pressable>
            ) : null}
            {!directionsTarget && !eventRow.official_url ? (
              <Pressable
                testID="event-cta-share"
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
