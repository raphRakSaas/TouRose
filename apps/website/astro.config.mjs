import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://tourose.app',
  vite: {
    plugins: [tailwindcss()],
  },
});
