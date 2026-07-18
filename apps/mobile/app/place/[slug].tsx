import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { fetchPublicPlaceBySlug } from '@/src/data/catalog-api';

export default function PlaceDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const placeSlug = typeof slug === 'string' ? slug : '';
  const [isFavorite, setIsFavorite] = useState(false);

  const placeQuery = useQuery({
    queryKey: ['catalog', 'place', placeSlug],
    queryFn: () => fetchPublicPlaceBySlug(placeSlug),
    enabled: placeSlug.length > 0,
  });

  const placeRow = placeQuery.data;

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
                accessibilityRole="button"
                onPress={() => setIsFavorite((previous) => !previous)}
                className="flex-1 items-center rounded-[14px] border-[1.5px] border-brick-500 py-[11px]"
                style={{ backgroundColor: isFavorite ? '#C45C3E' : 'transparent' }}
              >
                <Text
                  className={`text-[14px] font-body-semibold ${
                    isFavorite ? 'text-white' : 'text-brick-700'
                  }`}
                >
                  Favori
                </Text>
              </Pressable>
              <View className="flex-1 items-center rounded-[14px] border-[1.5px] border-sand-200 py-[11px]">
                <Text className="text-[14px] font-body-semibold text-ink-800">Partager</Text>
              </View>
              <View className="flex-1 items-center rounded-[14px] border-[1.5px] border-sand-200 py-[11px]">
                <Text className="text-[14px] font-body-semibold text-ink-800">Visité</Text>
              </View>
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
