import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export type CalendarEventInput = {
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  notes?: string | null;
  url?: string;
};

async function ensureCalendarPermission(): Promise<boolean> {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
}

async function defaultWritableCalendarId(): Promise<string> {
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return defaultCalendar.id;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find(
    (calendar) => calendar.allowsModifications && calendar.accessLevel !== 'none',
  );
  if (!writable) {
    throw new Error('Aucun calendrier modifiable trouvé sur cet appareil.');
  }
  return writable.id;
}

export async function addEventToCalendar(input: CalendarEventInput): Promise<string> {
  if (!input.startsAt) {
    throw new Error('Cet événement n’a pas encore de date à ajouter.');
  }

  const granted = await ensureCalendarPermission();
  if (!granted) {
    throw new Error('Permission calendrier refusée.');
  }

  const startDate = new Date(input.startsAt);
  const endDate = input.endsAt
    ? new Date(input.endsAt)
    : new Date(startDate.getTime() + 90 * 60 * 1000);

  const calendarId = await defaultWritableCalendarId();
  return Calendar.createEventAsync(calendarId, {
    title: input.title,
    startDate,
    endDate,
    notes: input.notes ?? undefined,
    url: input.url,
    timeZone: 'Europe/Paris',
  });
}
