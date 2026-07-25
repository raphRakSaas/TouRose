import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getOrCreateInstallationId } from '@/src/lib/installation-id';
import { getSupabaseClient } from '@/src/lib/supabase';
import type { NotificationSettings } from '@/src/store/preferences-store';

const notificationsEnabled = process.env.EXPO_PUBLIC_NOTIFICATIONS_ENABLED === 'true';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function arePushNotificationsEnabled(): boolean {
  return notificationsEnabled;
}

export async function ensurePushPermission(): Promise<boolean> {
  if (!notificationsEnabled) {
    return false;
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted ?? false;
}

export async function syncPushSubscription(
  notificationSettings: NotificationSettings,
  options?: { optedOut?: boolean },
): Promise<void> {
  if (!notificationsEnabled) {
    return;
  }

  const hasAnyEnabled =
    notificationSettings.weekendIdeas ||
    notificationSettings.favoriteReminders ||
    notificationSettings.weatherSuggestions;

  const optedOut = options?.optedOut === true || !hasAnyEnabled;
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return;
  }

  if (optedOut) {
    const installationId = await getOrCreateInstallationId();
    await callRegisterPush({
      installationId,
      platform: mapPlatform(),
      notificationPrefs: notificationSettings,
      optedOut: true,
    });
    return;
  }

  const permissionGranted = await ensurePushPermission();
  if (!permissionGranted) {
    return;
  }

  const pushToken = await Notifications.getExpoPushTokenAsync();
  const installationId = await getOrCreateInstallationId();

  await callRegisterPush({
    installationId,
    expoPushToken: pushToken.data,
    platform: mapPlatform(),
    notificationPrefs: notificationSettings,
    optedOut: false,
  });
}

async function callRegisterPush(payload: Record<string, unknown>): Promise<void> {
  const supabaseClient = getSupabaseClient();
  if (!supabaseClient) {
    return;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return;
  }

  await fetch(`${supabaseUrl}/functions/v1/register-push-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export async function scheduleFavoriteReminder(options: {
  eventTitle: string;
  eventSlug: string;
  startsAt: Date;
}): Promise<void> {
  if (!notificationsEnabled) {
    return;
  }

  const permissionGranted = await ensurePushPermission();
  if (!permissionGranted) {
    return;
  }

  const reminderDate = new Date(options.startsAt);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(18, 0, 0, 0);

  if (reminderDate.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rappel favori',
      body: `${options.eventTitle} a lieu demain — pense à y aller.`,
      data: { slug: options.eventSlug, type: 'favorite_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
}

export async function cancelFavoriteRemindersForSlug(eventSlug: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const scheduledNotification of scheduledNotifications) {
    const slug = scheduledNotification.content.data?.slug;
    if (slug === eventSlug) {
      await Notifications.cancelScheduledNotificationAsync(scheduledNotification.identifier);
    }
  }
}

function mapPlatform(): 'ios' | 'android' | 'web' | 'unknown' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'web') return 'web';
  return 'unknown';
}
