import { Stack } from 'expo-router';
import { ScrollView, Switch, Text, View } from 'react-native';

import {
  usePreferencesStore,
  type NotificationSettings,
} from '@/src/store/preferences-store';

const NOTIFICATION_ROWS: ReadonlyArray<{
  settingKey: keyof NotificationSettings;
  title: string;
  description: string;
}> = [
  {
    settingKey: 'weekendIdeas',
    title: 'Idées pour le week-end',
    description: 'Le vendredi, une sélection de sorties pour samedi et dimanche.',
  },
  {
    settingKey: 'favoriteReminders',
    title: 'Rappels de favoris',
    description: 'La veille d’un événement que tu as mis en favori.',
  },
  {
    settingKey: 'weatherSuggestions',
    title: 'Suggestions météo',
    description: 'Des idées adaptées quand il fait beau (ou pas).',
  },
];

export default function NotificationsSettingsScreen() {
  const notificationSettings = usePreferencesStore((state) => state.notificationSettings);
  const setNotificationSetting = usePreferencesStore((state) => state.setNotificationSetting);

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView className="flex-1 bg-sand-50" contentContainerClassName="px-5 pb-12 pt-4">
        <Text className="mb-5 text-[14px] leading-[1.6] font-body text-ink-500">
          Choisis ce que TouRose peut t’envoyer. Ces réglages sont enregistrés sur ton téléphone
          et seront appliqués dès l’activation des notifications push.
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
          {NOTIFICATION_ROWS.map((row, index) => (
            <View
              key={row.settingKey}
              className={`flex-row items-center justify-between py-4 ${
                index < NOTIFICATION_ROWS.length - 1 ? 'border-b border-sand-200' : ''
              }`}
            >
              <View className="mr-4 flex-1">
                <Text className="text-[15px] font-body-semibold text-ink-800">{row.title}</Text>
                <Text className="mt-0.5 text-[13px] leading-[1.5] font-body text-ink-500">
                  {row.description}
                </Text>
              </View>
              <Switch
                testID={`notif-switch-${row.settingKey}`}
                value={notificationSettings[row.settingKey]}
                onValueChange={(enabled) => setNotificationSetting(row.settingKey, enabled)}
                trackColor={{ false: '#EDE0CB', true: '#C45C3E' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        <Text className="mt-5 text-[13px] leading-[1.6] font-body text-ink-400">
          Les notifications push arriveront dans une prochaine version : tes choix seront
          respectés dès leur activation, rien ne sera envoyé sans ton accord.
        </Text>
      </ScrollView>
    </>
  );
}
