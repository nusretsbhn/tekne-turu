import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      minify: false,
      manifest: {
        name: 'Tekne Turu Check-in',
        short_name: 'Check-in',
        description: 'Tekne turu yolcu check-in ekranı',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a1a1a',
      },
    }),
  ],
  server: { port: 5175, proxy: { '/api': { target: 'http://localhost:5244', changeOrigin: true } } },
})
