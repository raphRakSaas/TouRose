import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { fetchPublicEventBySlug } from '@/src/data/catalog-api';

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const eventSlug = typeof slug === 'string' ? slug : '';
  const [isFavorite, setIsFavorite] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['catalog', 'event', eventSlug],
    queryFn: () => fetchPublicEventBySlug(eventSlug),
    enabled: eventSlug.length > 0,
  });

  const eventRow = eventQuery.data;

  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: '#1F1C19' }} />
      <ScrollView
        className="flex-1 bg-sand-50"
        contentContainerClassName="pb-10"
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
        <ImagePlaceholder
          label={eventRow?.title ?? 'Événement'}
          source={eventRow?.image_url ? { uri: eventRow.image_url } : undefined}
          className="w-full"
          height={220}
        />

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
          <View className="px-[22px] pt-[22px]">
            <Text className="mb-2.5 font-display text-[22px] text-ink-800">{eventRow.title}</Text>
            {eventRow.image_attribution ? (
              <Text className="mb-3 text-[11px] font-body text-ink-300">
                {eventRow.image_attribution}
              </Text>
            ) : null}
            <View className="mb-[18px] gap-1.5">
              {eventRow.next_starts_at ? (
                <Text className="text-[14px] font-body text-ink-800">
                  {new Date(eventRow.next_starts_at).toLocaleString('fr-FR')}
                </Text>
              ) : null}
              <Text className="text-[14px] font-body text-ink-800">
                {eventRow.price_type} · {eventRow.indoor_outdoor}
              </Text>
            </View>
            <View className="mb-5 flex-row gap-2.5">
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsFavorite((previous) => !previous)}
                className="flex-1 items-center rounded-[14px] border-[1.5px] border-brick-500 py-2.5"
                style={{
                  backgroundColor: isFavorite ? '#C45C3E' : 'transparent',
                }}
              >
                <Text
                  className={`text-[13px] font-body-semibold ${
                    isFavorite ? 'text-white' : 'text-brick-700'
                  }`}
                >
                  Favori
                </Text>
              </Pressable>
              <View className="flex-1 items-center rounded-[14px] border-[1.5px] border-sand-200 py-2.5">
                <Text className="text-[13px] font-body-semibold text-ink-800">Agenda</Text>
              </View>
              <View className="flex-1 items-center rounded-[14px] border-[1.5px] border-sand-200 py-2.5">
                <Text className="text-[13px] font-body-semibold text-ink-800">Lien officiel</Text>
              </View>
            </View>
            <Text className="text-[15px] leading-[1.7] font-body text-ink-800">
              {eventRow.summary ?? 'Sans résumé'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
