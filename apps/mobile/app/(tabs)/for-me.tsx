import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogListRow } from '@/components/ui/CatalogListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import {
  hrefForLocalItem,
  listDiscover,
  listFavorites,
  listVisited,
  type LocalCatalogItem,
} from '@/src/data/local-catalog';
import { usePreferencesStore } from '@/src/store/preferences-store';

type MeSegment = 'favorites' | 'discover' | 'visited';
type SupportScreen = null | 'form' | 'thanks';

const SUPPORT_AMOUNTS = [
  { label: 'Une gorgée de café', amount: '1 €' },
  { label: 'Un croissant rose', amount: '5 €' },
  { label: 'Une brique de Toulouse', amount: '10 €' },
] as const;

export default function ForMeScreen() {
  const company = usePreferencesStore((state) => state.company);
  const setCompany = usePreferencesStore((state) => state.setCompany);
  const [segment, setSegment] = useState<MeSegment>('favorites');
  const [supportScreen, setSupportScreen] = useState<SupportScreen>(null);
  const [favorites, setFavorites] = useState<LocalCatalogItem[]>([]);
  const [discover, setDiscover] = useState<LocalCatalogItem[]>([]);
  const [visited, setVisited] = useState<LocalCatalogItem[]>([]);

  const reloadLists = useCallback(async () => {
    const [favoriteRows, discoverRows, visitedRows] = await Promise.all([
      listFavorites(),
      listDiscover(),
      listVisited(),
    ]);
    setFavorites(favoriteRows);
    setDiscover(discoverRows);
    setVisited(visitedRows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadLists();
    }, [reloadLists]),
  );

  if (supportScreen === 'form') {
    return (
      <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
        <View className="flex-row items-center gap-3 px-6 pb-2 pt-4">
          <Pressable accessibilityRole="button" onPress={() => setSupportScreen(null)}>
            <FontAwesome name="chevron-left" size={16} color="#1F1C19" />
          </Pressable>
          <Text className="font-display text-[22px] text-ink-800">Soutenir TouRose</Text>
        </View>
        <Text className="px-6 pb-5 text-[14px] leading-[1.6] font-body text-ink-500">
          Aucun avantage, juste un coup de pouce sympa pour continuer à construire l'app.
        </Text>
        <View className="gap-3 px-6">
          {SUPPORT_AMOUNTS.map((option) => (
            <Pressable
              key={option.amount}
              accessibilityRole="button"
              onPress={() => setSupportScreen('thanks')}
              className="rounded-[20px] bg-white p-[18px]"
              style={{
                shadowColor: '#1F1C19',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View className="mb-1.5 flex-row items-baseline justify-between">
                <Text className="text-[16px] font-body-bold text-ink-800">{option.label}</Text>
                <Text className="font-display text-[20px] text-brick-900">{option.amount}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (supportScreen === 'thanks') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-sand-50 px-8" edges={['top']}>
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-brick-500">
          <FontAwesome name="check" size={36} color="#FBF1EC" />
        </View>
        <Text className="mb-3 text-center font-display text-2xl text-ink-800">
          Merci, sincèrement
        </Text>
        <Text className="mb-6 text-center text-[15px] leading-[1.7] font-body text-ink-500">
          Ta brique rose est posée. On continue à construire TouRose avec le même soin.
        </Text>
        <PrimaryButton label="Fermer" variant="outline" onPress={() => setSupportScreen(null)} />
      </SafeAreaView>
    );
  }

  const segmentItems =
    segment === 'favorites' ? favorites : segment === 'discover' ? discover : visited;

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <Text className="px-5 pb-4 pt-4 font-display text-2xl text-ink-800">Pour moi</Text>

        <View className="mb-3.5 flex-row gap-5 border-b border-sand-200 px-5">
          {(
            [
              ['favorites', 'Favoris'],
              ['discover', 'À découvrir'],
              ['visited', 'Visité'],
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
                    isActive ? 'font-body-bold text-brick-500' : 'font-body text-ink-300'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="px-5 pb-3">
          {segmentItems.length === 0 ? (
            <Text className="py-4 text-sm font-body text-ink-500">
              {segment === 'favorites'
                ? 'Aucun favori pour l’instant — ajoute-en depuis une fiche.'
                : segment === 'discover'
                  ? 'Rien à découvrir pour le moment — ajoute des idées depuis Explorer.'
                  : 'Aucun lieu visité pour l’instant.'}
            </Text>
          ) : (
            segmentItems.map((item, index) => (
              <Link key={`${item.entityType}-${item.entityId}`} href={hrefForLocalItem(item) as never} asChild>
                <CatalogListRow
                  title={item.title}
                  subtitle={
                    item.subtitle ??
                    (item.entityType === 'event' ? 'Événement' : 'Lieu')
                  }
                  imageLabel={item.title}
                  thumbSize={56}
                  showDivider={index < segmentItems.length - 1}
                />
              </Link>
            ))
          )}
        </View>

        <View className="mx-5 my-2 h-px bg-sand-200" />

        <View className="px-5">
          <Text className="mb-2 pt-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
            Compagnie
          </Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {(['seul', 'couple', 'amis', 'famille'] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setCompany(option)}
                className={`rounded-full px-4 py-2 ${
                  company === option ? 'bg-brick-500' : 'bg-sand-100'
                }`}
              >
                <Text
                  className={`text-[13px] capitalize ${
                    company === option
                      ? 'font-body-semibold text-white'
                      : 'font-body text-ink-800'
                  }`}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          {(
            [
              ['Préférences', '/settings/preferences'],
              ['Notifications', '/settings/notifications'],
              ['Compte (facultatif)', '/settings/account'],
              ['Soutenir TouRose', 'support'],
              ['Sources & confidentialité', '/settings/privacy'],
            ] as const
          ).map(([label, action], index, rows) => (
            <Pressable
              key={label}
              testID={`me-menu-${label}`}
              accessibilityRole="button"
              onPress={
                action === 'support'
                  ? () => setSupportScreen('form')
                  : () => router.push(action as never)
              }
              className={`flex-row items-center justify-between py-3.5 ${
                index < rows.length - 1 ? 'border-b border-sand-200' : ''
              }`}
            >
              <Text
                className={`text-[15px] font-body ${
                  action === 'support' ? 'font-body-semibold text-brick-900' : 'text-ink-800'
                }`}
              >
                {label}
              </Text>
              <Text
                className={`text-[15px] ${
                  action === 'support' ? 'text-brick-900' : 'text-ink-300'
                }`}
              >
                ›
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
