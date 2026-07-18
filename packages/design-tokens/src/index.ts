/** Shared TouRose design tokens — brick, Garonne, violet accents. */
export const colors = {
  brick: {
    50: '#FBF4F1',
    100: '#F5E4DC',
    200: '#EBC5B4',
    300: '#DFA189',
    400: '#D07A5E',
    500: '#C45C3E',
    600: '#A84A32',
    700: '#8B3C2A',
    800: '#6F3023',
    900: '#4A2018',
  },
  garonne: {
    50: '#F0F7F8',
    100: '#D9EBEE',
    200: '#B3D6DC',
    300: '#84BBC5',
    400: '#5598A6',
    500: '#3A7A88',
    600: '#2F6270',
    700: '#284F5A',
    800: '#23414A',
    900: '#1C3239',
  },
  violet: {
    50: '#F7F3FA',
    100: '#EDE4F4',
    200: '#D9C7E8',
    300: '#C0A3D7',
    400: '#A57BC3',
    500: '#8B5EAD',
    600: '#734A91',
    700: '#5D3C75',
    800: '#4B325E',
    900: '#352240',
  },
  sand: {
    50: '#FBF8F4',
    100: '#F3EDE4',
    200: '#E6DAC8',
    300: '#D4C2A6',
    400: '#BFA57F',
    500: '#A88B63',
  },
  ink: {
    50: '#F6F5F4',
    100: '#E8E6E3',
    200: '#D1CDC7',
    300: '#A9A39A',
    400: '#7A7369',
    500: '#534D45',
    600: '#3D3832',
    700: '#2C2824',
    800: '#1F1C19',
    900: '#141210',
  },
  semantic: {
    success: '#2F7D4A',
    warning: '#C47A1A',
    danger: '#B33A2B',
    info: '#3A7A88',
  },
} as const;

export const typography = {
  fontFamily: {
    display: '"Fraunces", "Iowan Old Style", "Palatino Linotype", serif',
    body: '"Source Sans 3", "Segoe UI", "Helvetica Neue", sans-serif',
    mono: '"IBM Plex Mono", "SFMono-Regular", Menlo, monospace',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  soft: '0 8px 24px rgba(32, 24, 20, 0.08)',
  medium: '0 12px 32px rgba(32, 24, 20, 0.12)',
} as const;

export const brand = {
  name: 'TouRose',
  tagline: 'Toulouse à voir, à vivre, à aimer.',
  primary: colors.brick[500],
  secondary: colors.garonne[500],
  accent: colors.violet[500],
  background: colors.sand[50],
  foreground: colors.ink[800],
} as const;

export const tokens = {
  brand,
  colors,
  typography,
  spacing,
  radii,
  shadows,
} as const;

export type DesignTokens = typeof tokens;
