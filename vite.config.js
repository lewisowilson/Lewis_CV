import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'index-react': resolve(__dirname, 'index-react.html'),
        'index-v2': resolve(__dirname, 'index-v2.html'),
        'index-v3': resolve(__dirname, 'index-v3.html'),
        'index-v4': resolve(__dirname, 'index-v4.html'),
      },
    },
  },
})
