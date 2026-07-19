import { addEventToCalendar } from './calendar';

describe('addEventToCalendar', () => {
  it('crée un événement quand une date est fournie', async () => {
    const eventId = await addEventToCalendar({
      title: 'Concert',
      startsAt: '2026-07-20T20:00:00.000Z',
      endsAt: null,
      notes: 'Test',
      url: 'https://example.com',
    });
    expect(eventId).toBe('event-cal-1');
  });

  it('refuse sans date de début', async () => {
    await expect(
      addEventToCalendar({ title: 'Sans date', startsAt: null, endsAt: null }),
    ).rejects.toThrow(/pas encore de date/);
  });
});
