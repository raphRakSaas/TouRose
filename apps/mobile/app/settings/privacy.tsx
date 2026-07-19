import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, Text, View } from 'react-native';

const DATA_SOURCES: ReadonlyArray<{
  name: string;
  description: string;
  url: string;
}> = [
  {
    name: 'OpenAgenda',
    description: 'Événements publics de Toulouse et sa région (images créditées à leur source).',
    url: 'https://openagenda.com',
  },
  {
    name: 'Wikimedia Commons',
    description: 'Photos de lieux sous licence libre, avec auteur et licence affichés.',
    url: 'https://commons.wikimedia.org',
  },
  {
    name: 'OpenFreeMap · OpenStreetMap',
    description: 'Fond de carte de l’onglet Carte, données © contributeurs OpenStreetMap.',
    url: 'https://openfreemap.org',
  },
  {
    name: 'Open-Meteo',
    description: 'Météo du jour affichée sur la page « Aujourd’hui ».',
    url: 'https://open-meteo.com',
  },
];

export default function PrivacySettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sources & confidentialité' }} />
      <ScrollView className="flex-1 bg-sand-50" contentContainerClassName="px-5 pb-12 pt-4">
        <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
          Confidentialité
        </Text>
        <View
          className="mb-7 rounded-[20px] bg-white p-[18px]"
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
              ['lock', 'Pas de compte requis, pas de profil publicitaire, pas de revente de données.'],
              ['mobile', 'Favoris, découvertes et préférences restent stockés sur ton téléphone.'],
              [
                'map-marker',
                'Ta position sert uniquement à trier par proximité ; elle n’est jamais conservée.',
              ],
            ] as const
          ).map(([iconName, sentence], index, rows) => (
            <View
              key={iconName}
              className={`flex-row items-start gap-3 ${index < rows.length - 1 ? 'mb-3.5' : ''}`}
            >
              <View className="mt-0.5 w-5 items-center">
                <FontAwesome name={iconName} size={15} color="#C45C3E" />
              </View>
              <Text className="flex-1 text-[14px] leading-[1.6] font-body text-ink-800">
                {sentence}
              </Text>
            </View>
          ))}
        </View>

        <Text className="mb-2 text-[13px] font-body-bold uppercase tracking-wide text-ink-500">
          Sources des données
        </Text>
        <Text className="mb-3 text-[14px] leading-[1.6] font-body text-ink-500">
          Les contenus éditoriaux (lieux découverte, conseils) sont rédigés par TouRose. Le reste
          provient de ces sources ouvertes :
        </Text>
        <View
          className="rounded-[20px] bg-white px-[18px]"
          style={{
            shadowColor: '#1F1C19',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {DATA_SOURCES.map((source, index) => (
            <Pressable
              key={source.name}
              testID={`privacy-source-${source.name}`}
              accessibilityRole="link"
              onPress={() => void WebBrowser.openBrowserAsync(source.url)}
              className={`flex-row items-center justify-between py-3.5 ${
                index < DATA_SOURCES.length - 1 ? 'border-b border-sand-200' : ''
              }`}
            >
              <View className="mr-3 flex-1">
                <Text className="text-[15px] font-body-semibold text-ink-800">{source.name}</Text>
                <Text className="mt-0.5 text-[13px] leading-[1.5] font-body text-ink-500">
                  {source.description}
                </Text>
              </View>
              <FontAwesome name="external-link" size={13} color="#A39B90" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
