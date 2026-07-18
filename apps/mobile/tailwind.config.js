/** @type {import('tailwindcss').Config} */
const touroseTheme = require('../../packages/design-tokens/src/nativewind-theme.cjs');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: touroseTheme.colors,
      fontFamily: touroseTheme.fontFamily,
      borderRadius: touroseTheme.borderRadius,
    },
  },
  plugins: [],
};
