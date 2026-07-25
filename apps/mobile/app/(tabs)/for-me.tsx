import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { BrandWordmark } from '@/components/ui/BrandWordmark';
import { CatalogListRow } from '@/components/ui/CatalogListRow';
import { SupportPromoCard } from '@/components/ui/SupportPromoCard';
import {
  hrefForLocalItem,
  listDiscover,
  listFavorites,
  listVisited,
  type LocalCatalogItem,
} from '@/src/data/local-catalog';
import { SUPPORT_AMOUNT_OPTIONS, type SupportAmountCents } from '@/src/lib/support-amounts';
import { createSupportCheckoutSession } from '@/src/lib/support-checkout';
import { usePreferencesStore } from '@/src/store/preferences-store';

type MeSegment = 'favorites' | 'discover' | 'visited';
type SupportScreen = null | 'form';

export default function ForMeScreen() {
  const company = usePreferencesStore((state) => state.company);
  const setCompany = usePreferencesStore((state) => state.setCompany);
  const [segment, setSegment] = useState<MeSegment>('favorites');
  const [supportScreen, setSupportScreen] = useState<SupportScreen>(null);
  const [favorites, setFavorites] = useState<LocalCatalogItem[]>([]);
  const [discover, setDiscover] = useState<LocalCatalogItem[]>([]);
  const [visited, setVisited] = useState<LocalCatalogItem[]>([]);
  const [isProcessingSupport, setIsProcessingSupport] = useState(false);

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

  async function onSupportAmountPress(amountCents: SupportAmountCents): Promise<void> {
    setIsProcessingSupport(true);
    try {
      const checkoutResult = await createSupportCheckoutSession(amountCents);
      if (!checkoutResult.ok) {
        Alert.alert('Paiement indisponible', checkoutResult.errorMessage);
        return;
      }
      await WebBrowser.openBrowserAsync(checkoutResult.checkoutUrl);
    } finally {
      setIsProcessingSupport(false);
    }
  }

  if (supportScreen === 'form') {
    return (
      <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
        <View className="flex-row items-center gap-3 px-6 pb-2 pt-4">
          <Pressable accessibilityRole="button" onPress={() => setSupportScreen(null)}>
            <FontAwesome name="chevron-left" size={16} color="#1F1C19" />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Text className="font-display text-[22px] text-ink-800">Soutenir</Text>
            <BrandWordmark height={22} />
          </View>
        </View>
        <ScrollView contentContainerClassName="gap-4 px-6 pb-10 pt-1">
          <Text className="text-[15px] leading-[1.65] font-body text-ink-600">
            TouRose reste gratuit, sans pub et sans compte obligatoire. Si l’app t’a aidé à sortir,
            tu peux contribuer au prix d’un café toulousain.
          </Text>
          {SUPPORT_AMOUNT_OPTIONS.map((option, optionIndex) => (
            <AnimatedListItem key={option.amountCents} index={optionIndex}>
              <Pressable
                testID={`support-detail-${option.amountCents}`}
                accessibilityRole="button"
                disabled={isProcessingSupport}
                onPress={() => void onSupportAmountPress(option.amountCents)}
                className="rounded-[20px] bg-white p-[18px]"
                style={{
                  shadowColor: '#1F1C19',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="mb-2 flex-row items-baseline justify-between gap-4">
                  <Text className="min-w-0 flex-1 text-[16px] font-body-bold text-ink-800">
                    {option.label}
                  </Text>
                  <Text className="font-display text-[22px] text-brick-900">{option.amount}</Text>
                </View>
                <Text className="text-[14px] leading-[1.55] font-body text-ink-500">
                  {option.description}
                </Text>
              </Pressable>
            </AnimatedListItem>
          ))}
          <Text className="pt-2 text-center text-[13px] leading-[1.6] font-body text-ink-400">
            Paiement sécurisé via Stripe. Aucun avantage in-app — juste notre gratitude.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const segmentItems =
    segment === 'favorites' ? favorites : segment === 'discover' ? discover : visited;

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <Text className="px-5 pb-4 pt-4 font-display text-2xl text-ink-800">Pour moi</Text>

        <SupportPromoCard
          isProcessing={isProcessingSupport}
          onAmountPress={(amountCents) => void onSupportAmountPress(amountCents)}
          onLearnMorePress={() => setSupportScreen('form')}
        />

        <View className="mb-4 flex-row gap-5 border-b border-sand-200 px-5 pt-1">
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
              <AnimatedListItem key={`${item.entityType}-${item.entityId}`} index={index}>
                <Link href={hrefForLocalItem(item) as never} asChild>
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
              </AnimatedListItem>
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
              ['Sources & confidentialité', '/settings/privacy'],
            ] as const
          ).map(([label, action], index, rows) => (
            <Pressable
              key={label}
              testID={`me-menu-${label}`}
              accessibilityRole="button"
              onPress={() => router.push(action as never)}
              className={`flex-row items-center justify-between py-3.5 ${
                index < rows.length - 1 ? 'border-b border-sand-200' : ''
              }`}
            >
              <Text className="text-[15px] font-body text-ink-800">{label}</Text>
              <Text className="text-[15px] text-ink-300">›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
