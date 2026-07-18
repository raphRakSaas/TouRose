import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuggestionCard } from '@/components/ui/SuggestionCard';
import { usePreferencesStore } from '@/src/store/preferences-store';

const MOMENT_CHIPS = ['Ce soir', "Aujourd'hui", 'Week-end', 'Choisir une date'] as const;
const QUICK_FILTERS = ['Gratuit', 'Dehors', 'Ce week-end', 'Autour de moi'] as const;

const SUGGESTIONS = [
  {
    id: 'best',
    title: 'Apéro-concert quai de Tounis',
    reason: 'Adapté à la météo et à 18 min à pied',
    badge: 'Meilleur choix',
    badgeColor: '#A94A30',
    imageLabel: 'Photo — Apéro-concert quai de Tounis',
    href: '/event/balade-fictive-quais' as const,
  },
  {
    id: 'free',
    title: 'Balade au Jardin des Plantes',
    reason: 'Gratuit et accessible en métro',
    badge: 'Gratuit',
    badgeColor: '#26525C',
    imageLabel: 'Photo — Balade au Jardin des Plantes',
    href: '/place/jardin-fictif-des-briques' as const,
  },
  {
    id: 'surprise',
    title: 'Atelier poterie à Saint-Cyprien',
    reason: 'Idéal en couple, il reste 2 places ce soir',
    badge: 'Surprise',
    badgeColor: '#5D3B77',
    imageLabel: 'Photo — Atelier poterie à Saint-Cyprien',
    href: '/place/belvedere-imaginaire-garonne' as const,
  },
];

export default function TodayScreen() {
  const company = usePreferencesStore((state) => state.company);
  const [selectedMoment, setSelectedMoment] = useState<(typeof MOMENT_CHIPS)[number]>('Ce soir');
  const [isLoaded, setIsLoaded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-sand-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="flex-row items-baseline justify-between px-5 pb-2 pt-4">
          <Text className="font-display text-[22px] text-brick-900">TouRose</Text>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-sand-100">
            <FontAwesome name="user-o" size={14} color="#A39B90" />
          </View>
        </View>

        <View className="px-5 pt-1.5">
          <Text className="mb-1 font-display-semibold text-[22px] text-ink-800">
            Salut, belle journée pour sortir
          </Text>
          <Text className="text-[14px] font-body text-ink-500">18° · Ensoleillé à Toulouse</Text>
          <Text className="mt-1 text-[12px] font-body text-ink-300">Compagnie : {company}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5 py-[18px]"
        >
          {MOMENT_CHIPS.map((moment) => (
            <Chip
              key={moment}
              label={moment}
              selected={selectedMoment === moment}
              tone={selectedMoment === moment ? 'solid' : 'white'}
              onPress={() => setSelectedMoment(moment)}
            />
          ))}
        </ScrollView>

        {!isLoaded ? (
          <View className="gap-3.5 px-5">
            {[0, 1, 2].map((index) => (
              <View key={index} className="h-[230px] rounded-3xl bg-sand-100" />
            ))}
          </View>
        ) : (
          <View className="gap-3.5 px-5">
            {SUGGESTIONS.map((suggestion) => (
              <Link key={suggestion.id} href={suggestion.href} asChild>
                <SuggestionCard
                  title={suggestion.title}
                  reason={suggestion.reason}
                  badge={suggestion.badge}
                  badgeColor={suggestion.badgeColor}
                  imageLabel={suggestion.imageLabel}
                />
              </Link>
            ))}
          </View>
        )}

        <View className="px-5 pb-1.5 pt-5">
          <PrimaryButton
            label="Affiner mes envies"
            variant="outline"
            onPress={() => setSheetOpen(true)}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-5 py-3.5"
        >
          {QUICK_FILTERS.map((filter) => (
            <Chip key={filter} label={filter} tone="cream" />
          ))}
        </ScrollView>

        <View className="px-5 pb-6 pt-2">
          <Text className="mb-2.5 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
            Toulouse en amoureux
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
            <ImagePlaceholder
              label="Toulouse en amoureux"
              className="rounded-2xl"
              height={100}
              width={150}
            />
            <ImagePlaceholder
              label="Balade nocturne"
              className="rounded-2xl"
              height={100}
              width={150}
            />
          </ScrollView>
        </View>
      </ScrollView>

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
              <Text className="text-[13px] font-body text-brick-900">Réinitialiser</Text>
            </View>
            <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
              Compagnie
            </Text>
            <View className="mb-[18px] flex-row flex-wrap gap-2">
              {(['Seul', 'Couple', 'Amis', 'Famille'] as const).map((label) => (
                <Chip
                  key={label}
                  label={label}
                  selected={company === label.toLowerCase()}
                  tone={company === label.toLowerCase() ? 'solid' : 'white'}
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
