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
        name: 'Tekne Turu Yönetim – Admin',
        short_name: 'Admin',
        description: 'Tekne turu admin paneli',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a1a1a',
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5244',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5244',
        changeOrigin: true,
      },
      '/tickets': {
        target: 'http://localhost:5244',
        changeOrigin: true,
      },
    },
  },
})
