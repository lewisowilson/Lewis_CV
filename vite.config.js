import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { SOCIAL_LINKS } from './site.config.js'

// Replaces %SOCIAL_<KEY>% placeholders in HTML with the URLs from site.config.js
const socialLinks = () => ({
  name: 'social-links',
  transformIndexHtml: (html) =>
    html.replace(/%SOCIAL_([A-Z]+)%/g, (match, key) => SOCIAL_LINKS[key] ?? match),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), socialLinks()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
})
