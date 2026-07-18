import { formatRelativeDayLabel } from '@tourose/shared';

describe('mobile shared bridge', () => {
  it('formats relative day labels', () => {
    const now = new Date('2026-07-18T12:00:00.000Z');
    expect(formatRelativeDayLabel(now.toISOString(), now)).toBe("Aujourd'hui");
  });
});
