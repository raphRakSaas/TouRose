import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { syncLocalCatalogWithCloud } from '@/src/data/catalog-sync';
import { parseAuthSessionFromUrl } from '@/src/lib/supabase';

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [statusMessage, setStatusMessage] = useState('Connexion en cours…');

  useEffect(() => {
    let isActive = true;
    void (async () => {
      const targetUrl = url ?? null;
      if (!targetUrl) {
        if (isActive) {
          setStatusMessage('Lien invalide.');
        }
        return;
      }

      const success = await parseAuthSessionFromUrl(targetUrl);
      if (!isActive) {
        return;
      }

      if (!success) {
        setStatusMessage('Impossible de valider le lien magique.');
        return;
      }

      try {
        await syncLocalCatalogWithCloud();
      } catch {
        // La session est valide même si la sync échoue (réseau).
      }

      router.replace('/settings/account');
    })();

    return () => {
      isActive = false;
    };
  }, [url]);

  return (
    <View className="flex-1 items-center justify-center bg-sand-50 px-8">
      <ActivityIndicator color="#C45C3E" />
      <Text className="mt-4 text-center text-[15px] font-body text-ink-600">{statusMessage}</Text>
    </View>
  );
}
