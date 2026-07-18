import { describe, expect, it } from 'vitest';
import { formatRelativeDayLabel } from '@tourose/shared';

describe('website shared utilities', () => {
  it('formats today in French', () => {
    const now = new Date('2026-07-18T08:00:00.000Z');
    expect(formatRelativeDayLabel(now.toISOString(), now)).toBe("Aujourd'hui");
  });
});
