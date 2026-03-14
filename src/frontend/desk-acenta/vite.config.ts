import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/acenta/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      minify: false,
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Tekne Turu Acenta Kayıt',
        short_name: 'Acenta Kayıt',
        description: 'Tekne turu acenta müşteri kayıt ekranı',
        start_url: '/acenta/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a1a1a',
      },
    }),
  ],
  server: {
    port: 5176,
    proxy: { '/api': { target: 'http://localhost:5244', changeOrigin: true } },
  },
})
