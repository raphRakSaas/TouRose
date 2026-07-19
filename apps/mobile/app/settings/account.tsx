import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { listDiscover, listFavorites, listVisited } from '@/src/data/local-catalog';

type LocalDataCounts = {
  favorites: number;
  discover: number;
  visited: number;
};

export default function AccountSettingsScreen() {
  const [counts, setCounts] = useState<LocalDataCounts>({
    favorites: 0,
    discover: 0,
    visited: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void (async () => {
        const [favoriteRows, discoverRows, visitedRows] = await Promise.all([
          listFavorites(),
          listDiscover(),
          listVisited(),
        ]);
        if (isActive) {
          setCounts({
            favorites: favoriteRows.length,
            discover: discoverRows.length,
            visited: visitedRows.length,
          });
        }
      })();
      return () => {
        isActive = false;
      };
    }, []),
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Compte' }} />
      <ScrollView className="flex-1 bg-sand-50" contentContainerClassName="px-5 pb-12 pt-4">
        <View
          className="mb-5 items-center rounded-[20px] bg-white px-5 py-7"
          style={{
            shadowColor: '#1F1C19',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-sand-100">
            <FontAwesome name="user-o" size={26} color="#C45C3E" />
          </View>
          <Text className="mb-1 font-display text-xl text-ink-800">Mode invité</Text>
          <Text className="text-center text-[14px] leading-[1.6] font-body text-ink-500">
            TouRose fonctionne sans compte : tes favoris, découvertes et lieux visités sont
            enregistrés uniquement sur ce téléphone.
          </Text>
        </View>

        <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
          Mes données sur cet appareil
        </Text>
        <View
          className="mb-5 rounded-[20px] bg-white px-[18px]"
          style={{
            shadowColor: '#1F1C19',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {(
            [
              ['heart-o', 'Favoris', counts.favorites],
              ['lightbulb-o', 'À découvrir', counts.discover],
              ['check-circle-o', 'Visités', counts.visited],
            ] as const
          ).map(([iconName, label, count], index, rows) => (
            <View
              key={label}
              className={`flex-row items-center justify-between py-3.5 ${
                index < rows.length - 1 ? 'border-b border-sand-200' : ''
              }`}
            >
              <View className="flex-row items-center gap-3">
                <FontAwesome name={iconName} size={16} color="#C45C3E" />
                <Text className="text-[15px] font-body text-ink-800">{label}</Text>
              </View>
              <Text testID={`account-count-${label}`} className="text-[15px] font-body-bold text-ink-800">
                {count}
              </Text>
            </View>
          ))}
        </View>

        <Text className="text-[13px] leading-[1.6] font-body text-ink-400">
          La création de compte (facultative) arrivera dans une prochaine version pour
          synchroniser tes listes entre plusieurs appareils. Rien ne changera pour le mode
          invité : il restera complet et sans inscription.
        </Text>
      </ScrollView>
    </>
  );
}
