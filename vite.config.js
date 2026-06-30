import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { PWA_MANIFEST } from './src/core/pwaManifest.js'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'brand/la3ibz-icon-mark.png',
        'brand/la3ibz-icon-mark-dark.png',
        'brand/la3ibz-pwa-192.png',
        'brand/la3ibz-pwa-512.png',
        'brand/la3ibz-pwa-maskable-192.png',
        'brand/la3ibz-pwa-maskable-512.png',
      ],
      manifest: {
        id: PWA_MANIFEST.scope,
        ...PWA_MANIFEST,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.firebaseapp\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.firebasestorage\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
