import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';

import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { fetchPublicPlaceBySlug } from '@/src/data/catalog-api';
import { isFavorite, isVisited, toggleFavorite, toggleVisited } from '@/src/data/local-catalog';
import { buildPublicCatalogUrl } from '@/src/lib/public-urls';

export default function PlaceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const placeSlug = typeof slug === 'string' ? slug : '';
  const [isFavoriteState, setIsFavoriteState] = useState(false);
  const [isVisitedState, setIsVisitedState] = useState(false);

  const placeQuery = useQuery({
    queryKey: ['catalog', 'place', placeSlug],
    queryFn: () => fetchPublicPlaceBySlug(placeSlug),
    enabled: placeSlug.length > 0,
  });

  const placeRow = placeQuery.data;

  useEffect(() => {
    if (!placeRow) {
      return;
    }
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

  async function onToggleFavorite(): Promise<void> {
    if (!placeRow) {
      return;
    }
    const nextValue = await toggleFavorite({
      entityType: 'place',
      entityId: placeRow.id,
      slug: placeRow.slug,
      title: placeRow.name,
      subtitle: `${placeRow.place_type} · ${placeRow.price_type}`,
    });
    setIsFavoriteState(nextValue);
  }

  async function onToggleVisited(): Promise<void> {
    if (!placeRow) {
      return;
    }
    const nextValue = await toggleVisited({
      entityType: 'place',
      entityId: placeRow.id,
      slug: placeRow.slug,
      title: placeRow.name,
      subtitle: `${placeRow.place_type} · ${placeRow.city ?? 'Toulouse'}`,
    });
    setIsVisitedState(nextValue);
  }

  async function onShare(): Promise<void> {
    if (!placeRow) {
      return;
    }
    const url = buildPublicCatalogUrl('place', placeRow.slug);
    await Share.share({
      title: placeRow.name,
      message: `${placeRow.name}\n${url}`,
      url,
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: '#1F1C19' }} />
      <ScrollView
        className="flex-1 bg-sand-50"
        contentContainerClassName="pb-10"
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
        <ImagePlaceholder label={placeRow?.name ?? 'Lieu'} className="w-full" height={220} />

        {placeQuery.isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#C45C3E" />
          </View>
        ) : null}

        {placeQuery.error ? (
          <View className="gap-2 px-5 pt-5">
            <Text className="text-base font-body-semibold text-brick-700">Impossible de charger</Text>
            <Text className="text-sm font-body text-ink-500">{placeQuery.error.message}</Text>
          </View>
        ) : null}

        {!placeQuery.isLoading && !placeQuery.error && !placeRow ? (
          <Text className="px-5 pt-5 text-sm font-body text-ink-500">
            Lieu introuvable ou non publié.
          </Text>
        ) : null}

        {placeRow ? (
          <View className="px-[22px] pt-[22px]">
            <Text className="mb-2.5 font-display text-[22px] text-ink-800">{placeRow.name}</Text>
            <Text className="mb-[18px] text-[14px] font-body text-ink-800">
              {placeRow.place_type} · {placeRow.city ?? 'Toulouse'} · {placeRow.price_type}
            </Text>
            <View className="mb-5 flex-row gap-2.5">
              <Pressable
                testID="place-favorite"
                accessibilityRole="button"
                accessibilityState={{ selected: isFavoriteState }}
                onPress={() => void onToggleFavorite()}
                className="flex-1 items-center rounded-[14px] border-[1.5px] border-brick-500 py-[11px]"
                style={{ backgroundColor: isFavoriteState ? '#C45C3E' : 'transparent' }}
              >
                <Text
                  className={`text-[14px] font-body-semibold ${
                    isFavoriteState ? 'text-white' : 'text-brick-700'
                  }`}
                >
                  Favori
                </Text>
              </Pressable>
              <Pressable
                testID="place-share"
                accessibilityRole="button"
                onPress={() => void onShare()}
                className="flex-1 items-center rounded-[14px] border-[1.5px] border-sand-200 py-[11px]"
              >
                <Text className="text-[14px] font-body-semibold text-ink-800">Partager</Text>
              </Pressable>
              <Pressable
                testID="place-visited"
                accessibilityRole="button"
                accessibilityState={{ selected: isVisitedState }}
                onPress={() => void onToggleVisited()}
                className="flex-1 items-center rounded-[14px] border-[1.5px] border-sand-200 py-[11px]"
                style={{ backgroundColor: isVisitedState ? '#26525C' : 'transparent' }}
              >
                <Text
                  className={`text-[14px] font-body-semibold ${
                    isVisitedState ? 'text-white' : 'text-ink-800'
                  }`}
                >
                  Visité
                </Text>
              </Pressable>
            </View>
            <Text className="mb-5 text-[15px] leading-[1.7] font-body text-ink-800">
              {placeRow.summary ?? 'Sans résumé'}
            </Text>
            <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
              Bon à savoir
            </Text>
            <Text className="mb-5 text-[14px] leading-[1.8] font-body text-ink-800">
              Meilleur moment : matinée ou fin de journée
              {'\n'}
              Accessible selon les infos publiées
            </Text>
            <Text className="text-[12px] font-body text-ink-300">
              Source : catalogue TouRose · vérifié localement
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
