import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { syncLocalCatalogWithCloud } from '@/src/data/catalog-sync';
import {
  listDiscover,
  listFavorites,
  listVisited,
} from '@/src/data/local-catalog';
import { getCurrentSession, sendMagicLink, signOut, subscribeToAuthChanges } from '@/src/lib/auth';
import { usePreferencesStore } from '@/src/store/preferences-store';

type LocalDataCounts = {
  favorites: number;
  discover: number;
  visited: number;
};

export default function AccountSettingsScreen() {
  const company = usePreferencesStore((state) => state.company);
  const interests = usePreferencesStore((state) => state.interests);
  const [counts, setCounts] = useState<LocalDataCounts>({
    favorites: 0,
    discover: 0,
    visited: 0,
  });
  const [email, setEmail] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const reloadScreen = useCallback(async () => {
    const [favoriteRows, discoverRows, visitedRows, sessionState] = await Promise.all([
      listFavorites(),
      listDiscover(),
      listVisited(),
      getCurrentSession(),
    ]);
    setCounts({
      favorites: favoriteRows.length,
      discover: discoverRows.length,
      visited: visitedRows.length,
    });
    setUserEmail(sessionState.user?.email ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadScreen();
      const unsubscribe = subscribeToAuthChanges(() => {
        void reloadScreen();
      });
      return unsubscribe;
    }, [reloadScreen]),
  );

  async function onSendMagicLink(): Promise<void> {
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setStatusMessage('Entre une adresse email valide.');
      return;
    }
    setIsSendingLink(true);
    setStatusMessage(null);
    try {
      await sendMagicLink(trimmedEmail);
      setStatusMessage('Lien magique envoyé — ouvre ton email sur cet appareil.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setIsSendingLink(false);
    }
  }

  async function onSyncNow(): Promise<void> {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      await syncLocalCatalogWithCloud({ company, interests: [...interests] });
      await reloadScreen();
      setStatusMessage('Tes listes sont synchronisées.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Synchronisation impossible.');
    } finally {
      setIsSyncing(false);
    }
  }

  async function onSignOutPress(): Promise<void> {
    await signOut();
    setUserEmail(null);
    setStatusMessage('Tu es déconnecté·e. Le mode invité reste actif.');
  }

  const isSignedIn = Boolean(userEmail);

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
            <FontAwesome name={isSignedIn ? 'user' : 'user-o'} size={26} color="#C45C3E" />
          </View>
          <Text className="mb-1 font-display text-xl text-ink-800">
            {isSignedIn ? 'Compte connecté' : 'Mode invité'}
          </Text>
          <Text className="text-center text-[14px] leading-[1.6] font-body text-ink-500">
            {isSignedIn
              ? `Connecté en tant que ${userEmail}. Tes listes peuvent être synchronisées entre appareils.`
              : 'TouRose fonctionne sans compte : tes favoris restent sur cet appareil. Connecte-toi pour les sauvegarder dans le cloud.'}
          </Text>
        </View>

        {!isSignedIn ? (
          <View className="mb-5 rounded-[20px] bg-white p-5">
            <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
              Connexion par lien magique
            </Text>
            <TextInput
              testID="account-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              placeholderTextColor="#A39B90"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="mb-3 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-[15px] font-body text-ink-800"
            />
            <PrimaryButton
              testID="account-send-magic-link"
              label={isSendingLink ? 'Envoi…' : 'Recevoir un lien magique'}
              disabled={isSendingLink}
              onPress={() => void onSendMagicLink()}
            />
          </View>
        ) : (
          <View className="mb-5 gap-2.5">
            <PrimaryButton
              testID="account-sync-now"
              label={isSyncing ? 'Synchronisation…' : 'Synchroniser mes listes'}
              disabled={isSyncing}
              onPress={() => void onSyncNow()}
            />
            <Pressable
              testID="account-sign-out"
              accessibilityRole="button"
              onPress={() => void onSignOutPress()}
              className="items-center py-2"
            >
              <Text className="text-[14px] font-body text-brick-700">Se déconnecter</Text>
            </Pressable>
          </View>
        )}

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

        {statusMessage ? (
          <Text testID="account-status-message" className="text-[13px] leading-[1.6] font-body text-ink-500">
            {statusMessage}
          </Text>
        ) : (
          <Text className="text-[13px] leading-[1.6] font-body text-ink-400">
            Le mode invité reste complet : aucune inscription obligatoire pour explorer Toulouse.
          </Text>
        )}
      </ScrollView>
    </>
  );
}
