import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from 'react-native';

import { useNetworkStatus } from '@/src/lib/network-status';

type OfflineBannerProps = {
  showingCachedData?: boolean;
};

export function OfflineBanner({ showingCachedData = false }: OfflineBannerProps) {
  const { isOnline, isReady } = useNetworkStatus();

  if (!isReady || (isOnline && !showingCachedData)) {
    return null;
  }

  return (
    <View
      testID="offline-banner"
      className="flex-row items-center gap-2 bg-ink-800 px-4 py-2"
      accessibilityRole="text"
    >
      <FontAwesome name="wifi" size={14} color="#FBF8F4" />
      <Text className="flex-1 text-[13px] font-body text-sand-50">
        {isOnline
          ? 'Données en cache — la connexion est revenue, tire pour actualiser.'
          : showingCachedData
            ? 'Hors ligne — contenu affiché depuis le cache local.'
            : 'Pas de connexion — certaines données peuvent être indisponibles.'}
      </Text>
    </View>
  );
}
