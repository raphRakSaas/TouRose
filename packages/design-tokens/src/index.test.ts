import { describe, expect, it } from 'vitest';
import { brand, colors, tokens } from './index';

describe('design tokens', () => {
  it('exposes TouRose brand identity', () => {
    expect(brand.name).toBe('TouRose');
    expect(brand.tagline).toContain('Toulouse');
    expect(brand.assets.icon).toBe('/brand/logo-icon.png');
    expect(brand.assets.wordmark).toBe('/brand/logo-wordmark.png');
    expect(tokens.colors.brick[500]).toBe(colors.brick[500]);
  });
});
