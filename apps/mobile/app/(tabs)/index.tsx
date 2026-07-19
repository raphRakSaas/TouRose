import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogListRow } from '@/components/ui/CatalogListRow';
import { Chip } from '@/components/ui/Chip';
import { EventCompactCard } from '@/components/ui/EventCompactCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StackedPicksModal } from '@/components/ui/StackedPicksModal';
import { SuggestionCard } from '@/components/ui/SuggestionCard';
import { TOULOUSE_PHOTOS } from '@/src/assets/photos';
import {
  fetchRecommendationPicks,
  fetchUpcomingEvents,
  logRecommendationImpression,
} from '@/src/data/catalog-api';
import { fetchToulouseWeather, formatWeatherLine } from '@/src/data/weather-api';
import {
  buildTodayFeed,
  EVENT_CATEGORIES,
  formatCustomDateLabel,
  type CategoryFilterKey,
  type MomentKey,
  type PriceFilterKey,
} from '@/src/domain/today-feed';
import {
  hideStackedPicksForToday,
  isStackedPicksHiddenForToday,
} from '@/src/lib/stacked-picks-pref';
import { usePreferencesStore } from '@/src/store/preferences-store';

/** Une seule présentation du modal par lancement d'app. */
let stackedPicksShownThisSession = false;

const MOMENT_CHIPS: { key: MomentKey; label: string }[] = [
  { key: 'tonight', label: 'Ce soir' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'weekend', label: 'Week-end' },
  { key: 'custom-date', label: 'Date…' },
];

const PRICE_CHIPS: { key: PriceFilterKey; label: string }[] = [
  { key: 'all', label: 'Tous prix' },
  { key: 'free', label: 'Gratuit' },
  { key: 'paid', label: 'Payant' },
];

const CATEGORY_CHIPS: { key: CategoryFilterKey; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  ...EVENT_CATEGORIES.map((category) => ({ key: category.slug, label: category.label })),
];

const SECTION_PHOTOS = [
  TOULOUSE_PHOTOS.quaisGaronne,
  TOULOUSE_PHOTOS.jardinDesPlantes,
  TOULOUSE_PHOTOS.saintCyprien,
  TOULOUSE_PHOTOS.capitolePlace,
  TOULOUSE_PHOTOS.toulouseAmoureux,
  TOULOUSE_PHOTOS.baladeNocturne,
] as const;

type FilterModalKey = 'moment' | 'price' | 'category' | null;

export default function TodayScreen() {
  const company = usePreferencesStore((state) => state.company);
  const interests = usePreferencesStore((state) => state.interests);
  const setCompany = usePreferencesStore((state) => state.setCompany);
  const resetPreferences = usePreferencesStore((state) => state.resetPreferences);

  const [selectedMoment, setSelectedMoment] = useState<MomentKey>('today');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showNativeDatePicker, setShowNativeDatePicker] = useState(false);
  const [priceFilter, setPriceFilter] = useState<PriceFilterKey>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterKey>('all');
  const [filterModal, setFilterModal] = useState<FilterModalKey>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stackedModalOpen, setStackedModalOpen] = useState(false);
  const [eventsDisplay, setEventsDisplay] = useState<'cards' | 'list'>('cards');

  const weatherQuery = useQuery({
    queryKey: ['weather', 'toulouse'],
    queryFn: fetchToulouseWeather,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const eventsQuery = useQuery({
    queryKey: ['catalog', 'events', 100],
    queryFn: () => fetchUpcomingEvents(100),
  });

  const recommendationsQuery = useQuery({
    queryKey: [
      'catalog',
      'recommendations',
      company,
      interests.join('|'),
      priceFilter,
      weatherQuery.data?.weatherCode ?? null,
    ],
    queryFn: () =>
      fetchRecommendationPicks({
        interests: [...interests],
        company,
        price: priceFilter,
        weatherCode: weatherQuery.data?.weatherCode,
        limit: 3,
      }),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const feed = useMemo(() => {
    if (!eventsQuery.data) {
      return { sections: [], allEvents: [], forYouPicks: [] };
    }
    return buildTodayFeed(eventsQuery.data, {
      now: new Date(),
      filters: {
        moment: selectedMoment,
        customDate: customDate ?? undefined,
        price: priceFilter,
        category: categoryFilter,
      },
      scoredPicks: recommendationsQuery.data,
    });
  }, [
    eventsQuery.data,
    recommendationsQuery.data,
    selectedMoment,
    customDate,
    priceFilter,
    categoryFilter,
  ]);

  useEffect(() => {
    if (stackedPicksShownThisSession || !eventsQuery.data || feed.forYouPicks.length === 0) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const hiddenToday = await isStackedPicksHiddenForToday();
      if (cancelled || hiddenToday || stackedPicksShownThisSession) {
        return;
      }
      stackedPicksShownThisSession = true;
      setStackedModalOpen(true);
      if (recommendationsQuery.data && recommendationsQuery.data.length > 0) {
        void logRecommendationImpression({
          eventIds: recommendationsQuery.data.map((pick) => pick.event.id),
          reasons: recommendationsQuery.data.map((pick) => ({
            slot: pick.slot,
            reasons: pick.reasons,
          })),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventsQuery.data, feed.forYouPicks.length, recommendationsQuery.data]);

  const isLoading = eventsQuery.isLoading;
  const loadError = eventsQuery.error;

  function onMomentPress(momentKey: MomentKey): void {
    if (momentKey === 'custom-date') {
      setShowNativeDatePicker(true);
      return;
    }
    setCustomDate(null);
    setSelectedMoment(momentKey);
  }

  function onNativeDateChange(event: DateTimePickerEvent, selected?: Date): void {
    if (Platform.OS === 'android') {
      setShowNativeDatePicker(false);
    }
    if (event.type === 'dismissed') {
      setShowNativeDatePicker(false);
      return;
    }
    if (selected) {
      setCustomDate(selected);
      setSelectedMoment('custom-date');
      if (Platform.OS === 'android') {
        setFilterModal(null);
      }
    }
  }

  async function onHideStackedForToday(): Promise<void> {
    await hideStackedPicksForToday();
    setStackedModalOpen(false);
  }

  const customDateLabel = customDate ? formatCustomDateLabel(customDate) : 'Date…';
  const momentButtonLabel =
    selectedMoment === 'custom-date'
      ? customDateLabel
      : (MOMENT_CHIPS.find((moment) => moment.key === selectedMoment)?.label ?? 'Quand');
  const priceButtonLabel = PRICE_CHIPS.find((price) => price.key === priceFilter)?.label ?? 'Prix';
  const categoryButtonLabel =
    CATEGORY_CHIPS.find((category) => category.key === categoryFilter)?.label ?? 'Catégorie';

  const weatherLine = weatherQuery.data
    ? formatWeatherLine(weatherQuery.data)
    : weatherQuery.isLoading
      ? 'Météo en cours de chargement…'
      : 'Météo indisponible pour le moment';

  const companyLabels: Record<string, string> = {
    seul: 'Seul',
    couple: 'Couple',
    amis: 'Amis',
    famille: 'Famille',
  };

  const listEvents = feed.allEvents;

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <View className="flex-row items-baseline justify-between px-5 pb-2 pt-4">
          <Text className="font-display text-[22px] text-brick-900">TouRose</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mon profil"
            onPress={() => router.push('/(tabs)/for-me')}
            className="h-8 w-8 items-center justify-center rounded-full bg-sand-100"
          >
            <FontAwesome name="user-o" size={14} color="#A39B90" />
          </Pressable>
        </View>

        <View className="px-5 pt-1.5">
          <Text className="mb-1 font-display-semibold text-[22px] text-ink-800">
            Salut, belle journée pour sortir
          </Text>
          <Text className="text-[14px] font-body text-ink-500">{weatherLine}</Text>
          <Text className="mt-1 text-[12px] font-body text-ink-300">
            Compagnie : {companyLabels[company] ?? company}
          </Text>
        </View>

        <View className="mt-4 flex-row gap-2 px-5 pb-3">
          {[
            { key: 'moment' as const, title: 'Quand', value: momentButtonLabel },
            { key: 'price' as const, title: 'Prix', value: priceButtonLabel },
            { key: 'category' as const, title: 'Catégorie', value: categoryButtonLabel },
          ].map((filterButton) => (
            <Pressable
              key={filterButton.key}
              accessibilityRole="button"
              testID={`open-filter-${filterButton.key}`}
              onPress={() => {
                setShowNativeDatePicker(false);
                setFilterModal(filterButton.key);
              }}
              className="min-w-0 flex-1 rounded-2xl border border-sand-200 bg-white px-3 py-2.5"
            >
              <Text className="text-[10px] font-body-bold uppercase tracking-wide text-ink-300">
                {filterButton.title}
              </Text>
              <Text
                className="mt-0.5 text-[12px] font-body-semibold text-ink-800"
                numberOfLines={1}
              >
                {filterButton.value}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="px-5 pb-3 pt-1">
          <PrimaryButton
            label="Affiner mes envies"
            variant="outline"
            onPress={() => setSheetOpen(true)}
          />
        </View>

        {isLoading ? (
          <View className="gap-3 px-5">
            {[0, 1].map((skeletonIndex) => (
              <View key={skeletonIndex} className="h-[140px] rounded-2xl bg-sand-100" />
            ))}
          </View>
        ) : null}

        {loadError ? (
          <View className="gap-2 px-5">
            <Text className="text-base font-body-semibold text-brick-700">
              Impossible de charger les idées
            </Text>
            <Text className="text-sm font-body text-ink-500">{loadError.message}</Text>
            <PrimaryButton
              label="Réessayer"
              variant="outline"
              onPress={() => void eventsQuery.refetch()}
            />
          </View>
        ) : null}

        {!isLoading && !loadError
          ? feed.sections.map((section, sectionIndex) => (
              <Animated.View
                key={section.key}
                entering={FadeInUp.duration(400).delay(Math.min(sectionIndex, 4) * 90)}
                className="mb-4"
              >
                <Text className="mb-2.5 px-5 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
                  {section.title}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2.5 px-5"
                >
                  {section.items.map((item) => (
                    <Link key={`${section.key}-${item.id}`} href={item.href as never} asChild>
                      <EventCompactCard
                        title={item.title}
                        reason={item.reason}
                        badge={item.badge}
                        badgeColor={item.badgeColor}
                        imageLabel={item.title}
                        imageSource={
                          item.imageUrl
                            ? { uri: item.imageUrl }
                            : SECTION_PHOTOS[item.photoIndex % SECTION_PHOTOS.length]
                        }
                        imageAttribution={item.imageAttribution}
                      />
                    </Link>
                  ))}
                </ScrollView>
              </Animated.View>
            ))
          : null}

        {!isLoading && !loadError ? (
          <Animated.View entering={FadeInUp.duration(400).delay(180)} className="px-5 pt-2">
            <View className="mb-2.5 flex-row items-center justify-between">
              <Text className="text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
                Tous les événements
              </Text>
              <View className="flex-row overflow-hidden rounded-full bg-sand-200">
                <Pressable
                  testID="display-mode-cards"
                  accessibilityRole="button"
                  accessibilityLabel="Affichage en cartes"
                  accessibilityState={{ selected: eventsDisplay === 'cards' }}
                  onPress={() => setEventsDisplay('cards')}
                  className={`px-3 py-1.5 ${eventsDisplay === 'cards' ? 'bg-ink-800' : ''}`}
                >
                  <FontAwesome
                    name="th-large"
                    size={13}
                    color={eventsDisplay === 'cards' ? '#FFFFFF' : '#8A8177'}
                  />
                </Pressable>
                <Pressable
                  testID="display-mode-list"
                  accessibilityRole="button"
                  accessibilityLabel="Affichage en liste"
                  accessibilityState={{ selected: eventsDisplay === 'list' }}
                  onPress={() => setEventsDisplay('list')}
                  className={`px-3 py-1.5 ${eventsDisplay === 'list' ? 'bg-ink-800' : ''}`}
                >
                  <FontAwesome
                    name="list"
                    size={13}
                    color={eventsDisplay === 'list' ? '#FFFFFF' : '#8A8177'}
                  />
                </Pressable>
              </View>
            </View>
            {listEvents.length === 0 ? (
              <Text className="text-sm font-body text-ink-500">
                Aucun événement pour ces filtres — élargis la date ou la catégorie.
              </Text>
            ) : eventsDisplay === 'cards' ? (
              <View className="gap-3.5">
                {listEvents.map((item, index) => (
                  <Animated.View
                    key={`card-${item.id}`}
                    entering={FadeIn.duration(300).delay(Math.min(index, 6) * 60)}
                  >
                    <Link href={item.href as never} asChild>
                      <SuggestionCard
                        title={item.title}
                        reason={item.reason}
                        badge={item.badge}
                        badgeColor={item.badgeColor}
                        imageLabel={item.title}
                        imageSource={
                          item.imageUrl
                            ? { uri: item.imageUrl }
                            : SECTION_PHOTOS[item.photoIndex % SECTION_PHOTOS.length]
                        }
                        imageAttribution={item.imageAttribution}
                      />
                    </Link>
                  </Animated.View>
                ))}
              </View>
            ) : (
              listEvents.map((item, index) => (
                <Link key={`list-${item.id}`} href={item.href as never} asChild>
                  <CatalogListRow
                    title={item.title}
                    subtitle={item.reason}
                    imageLabel={item.title}
                    imageSource={item.imageUrl ? { uri: item.imageUrl } : undefined}
                    imageAttribution={item.imageAttribution}
                    showDivider={index < listEvents.length - 1}
                  />
                </Link>
              ))
            )}
          </Animated.View>
        ) : null}
      </ScrollView>

      <StackedPicksModal
        picks={feed.forYouPicks}
        visible={stackedModalOpen}
        onClose={() => setStackedModalOpen(false)}
        onHideForToday={() => void onHideStackedForToday()}
      />

      {filterModal ? (
        <View className="absolute inset-0 z-40 items-center justify-center px-7">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer les filtres"
            className="absolute inset-0 bg-ink-800/45"
            onPress={() => {
              setShowNativeDatePicker(false);
              setFilterModal(null);
            }}
          />
          <View className="w-full max-w-[360px] rounded-[24px] bg-sand-50 p-5">
            <Text className="mb-4 font-display text-[21px] text-ink-800">
              {filterModal === 'moment'
                ? 'Quand sortir ?'
                : filterModal === 'price'
                  ? 'Quel prix ?'
                  : 'Quelle catégorie ?'}
            </Text>

            <ScrollView
              style={{ maxHeight: 320 }}
              showsVerticalScrollIndicator={false}
              contentContainerClassName="flex-row flex-wrap gap-2"
            >
              {filterModal === 'moment'
                ? MOMENT_CHIPS.map((moment) => {
                    const isSelected =
                      moment.key === 'custom-date'
                        ? selectedMoment === 'custom-date'
                        : selectedMoment === moment.key && customDate === null;
                    return (
                      <Chip
                        key={moment.key}
                        testID={`moment-filter-${moment.key}`}
                        label={moment.key === 'custom-date' ? customDateLabel : moment.label}
                        selected={isSelected}
                        tone={isSelected ? 'solid' : 'white'}
                        onPress={() => {
                          onMomentPress(moment.key);
                          if (moment.key !== 'custom-date') {
                            setFilterModal(null);
                          }
                        }}
                      />
                    );
                  })
                : null}
              {filterModal === 'price'
                ? PRICE_CHIPS.map((price) => (
                    <Chip
                      key={price.key}
                      testID={`price-filter-${price.key}`}
                      label={price.label}
                      selected={priceFilter === price.key}
                      tone={priceFilter === price.key ? 'solid' : 'white'}
                      onPress={() => {
                        setPriceFilter(price.key);
                        setFilterModal(null);
                      }}
                    />
                  ))
                : null}
              {filterModal === 'category'
                ? CATEGORY_CHIPS.map((category) => (
                    <Chip
                      key={category.key}
                      testID={`category-filter-${category.key}`}
                      label={category.label}
                      selected={categoryFilter === category.key}
                      tone={categoryFilter === category.key ? 'solid' : 'white'}
                      onPress={() => {
                        setCategoryFilter(category.key);
                        setFilterModal(null);
                      }}
                    />
                  ))
                : null}
            </ScrollView>

            {filterModal === 'moment' && showNativeDatePicker ? (
              <View className="mt-4 overflow-hidden rounded-2xl bg-white px-2 py-1">
                <DateTimePicker
                  value={customDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={onNativeDateChange}
                  locale="fr-FR"
                />
                {Platform.OS === 'ios' ? (
                  <PrimaryButton
                    label="Valider la date"
                    onPress={() => {
                      if (!customDate) {
                        setCustomDate(new Date());
                        setSelectedMoment('custom-date');
                      }
                      setShowNativeDatePicker(false);
                      setFilterModal(null);
                    }}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {sheetOpen ? (
        <View className="absolute inset-0 z-40">
          <Pressable
            accessibilityRole="button"
            className="absolute inset-0 bg-ink-800/35"
            onPress={() => setSheetOpen(false)}
          />
          <View className="absolute bottom-0 left-0 right-0 top-[150px] rounded-t-[28px] bg-sand-50 px-6 pb-8 pt-3.5">
            <View className="mb-1.5 h-1.5 w-10 self-center rounded-full bg-sand-200" />
            <View className="mb-[18px] flex-row items-baseline justify-between">
              <Text className="font-display text-[22px] text-ink-800">Affiner mes envies</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  resetPreferences();
                  setPriceFilter('all');
                  setCategoryFilter('all');
                  setSelectedMoment('today');
                  setCustomDate(null);
                }}
              >
                <Text className="text-[13px] font-body text-brick-900">Réinitialiser</Text>
              </Pressable>
            </View>
            <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
              Compagnie
            </Text>
            <View className="mb-[18px] flex-row flex-wrap gap-2">
              {(['Seul', 'Couple', 'Amis', 'Famille'] as const).map((label) => {
                const companyValue = label.toLowerCase() as typeof company;
                const isSelected = company === companyValue;
                return (
                  <Chip
                    key={label}
                    label={label}
                    selected={isSelected}
                    tone={isSelected ? 'solid' : 'white'}
                    onPress={() => setCompany(companyValue)}
                  />
                );
              })}
            </View>
            <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
              Prix
            </Text>
            <View className="mb-[18px] flex-row flex-wrap gap-2">
              {PRICE_CHIPS.map((price) => (
                <Chip
                  key={price.key}
                  label={price.label}
                  selected={priceFilter === price.key}
                  tone={priceFilter === price.key ? 'solid' : 'white'}
                  onPress={() => setPriceFilter(price.key)}
                />
              ))}
            </View>
            <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
              Catégorie
            </Text>
            <View className="mb-[18px] flex-row flex-wrap gap-2">
              {CATEGORY_CHIPS.map((category) => (
                <Chip
                  key={category.key}
                  label={category.label}
                  selected={categoryFilter === category.key}
                  tone={categoryFilter === category.key ? 'solid' : 'white'}
                  onPress={() => setCategoryFilter(category.key)}
                />
              ))}
            </View>
            <PrimaryButton label="Voir les idées" onPress={() => setSheetOpen(false)} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

/** Réinitialise le flag session — réservé aux tests. */
export function resetStackedPicksSessionFlagForTests(): void {
  stackedPicksShownThisSession = false;
}
