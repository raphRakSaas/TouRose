import { describe, expect, it } from 'vitest';
import { brand, colors, tokens } from './index';

describe('design tokens', () => {
  it('exposes TouRose brand identity', () => {
    expect(brand.name).toBe('TouRose');
    expect(brand.tagline).toContain('Toulouse');
    expect(tokens.colors.brick[500]).toBe(colors.brick[500]);
  });
});
