import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: process.env.VITE_ALLOW_EXTERNAL_HOST?.toLowerCase() === 'true' ? '0.0.0.0' : '127.0.0.1',
    proxy: {
      '/gas-api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gas-api/, ''),
      },
    },
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'dimdim',
        short_name: 'dimdim',
        description: 'Gestão financeira pessoal local-first',
        lang: 'pt-BR',
        theme_color: '#FFF5F5',
        background_color: '#FFF5F5',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: './icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: './icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/script\.google\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
