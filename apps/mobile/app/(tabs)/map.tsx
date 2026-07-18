import Constants from 'expo-constants';
import { Text, View } from 'react-native';

const mapStyleUrl =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ??
  (Constants.expoConfig?.extra?.mapStyleUrl as string | undefined) ??
  'https://demotiles.maplibre.org/style.json';

export default function MapScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-sand-50 p-5">
      <Text className="text-2xl font-semibold text-ink-800">Carte</Text>
      <Text className="text-center text-sm text-ink-500">
        MapLibre sera branché sur une development build. L’URL de style est configurable via
        EXPO_PUBLIC_MAP_STYLE_URL.
      </Text>
      <Text className="text-center text-xs text-garonne-700" selectable>
        {mapStyleUrl}
      </Text>
      <Text className="text-center text-xs text-ink-400">
        Attribution cartographique : visible dès l’intégration MapLibre.
      </Text>
    </View>
  );
}
