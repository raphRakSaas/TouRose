import { describe, expect, it } from 'vitest';
import { distanceFromToulouseCenter, formatRelativeDayLabel } from './index';

describe('shared utilities', () => {
  it('computes near-zero distance at Toulouse center', () => {
    expect(distanceFromToulouseCenter(43.6045, 1.444)).toBeLessThan(0.01);
  });

  it('formats today label in French', () => {
    const now = new Date('2026-07-18T10:00:00.000Z');
    expect(formatRelativeDayLabel(now.toISOString(), now)).toBe("Aujourd'hui");
  });
});
