import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      minify: false,
      manifest: {
        name: 'Tekne Turu Kayıt',
        short_name: 'Kayıt',
        description: 'Tekne turu müşteri kayıt ekranı',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a1a1a',
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: { '/api': { target: 'http://localhost:5244', changeOrigin: true } },
  },
})
