import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/landing/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      minify: false,
      manifest: {
        name: 'Tekne Turu',
        short_name: 'Tur',
        description: 'Tekne turu bilgi sayfası',
        start_url: '/landing/',
        display: 'standalone',
        background_color: '#f8f8f8',
        theme_color: '#1a1a2e',
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:5244', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5244', changeOrigin: true },
    },
  },
}))
