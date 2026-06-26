import path from 'node:path'
import { readFileSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const depsRoot = process.env.NG_DEPS_ROOT || path.dirname(fileURLToPath(import.meta.url))
const projectRoot = process.env.NG_PROJECT_ROOT
if (!depsRoot || !projectRoot) {
  throw new Error('NG_DEPS_ROOT and NG_PROJECT_ROOT are required (set by scripts/dev-win.mjs)')
}

function depsAliases() {
  const pkg = JSON.parse(readFileSync(path.join(depsRoot, 'package.json'), 'utf8'))
  const names = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ]
  return Object.fromEntries(
    names.map((name) => [name, path.join(depsRoot, 'node_modules', name)]),
  )
}

const { PWA_MANIFEST } = await import(
  pathToFileURL(path.join(projectRoot, 'src/core/pwaManifest.js')).href
)

export default defineConfig({
  root: projectRoot,
  cacheDir: path.join(depsRoot, 'node_modules', '.vite'),
  resolve: {
    alias: depsAliases(),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'brand/la3ibz-favicon.png',
        'brand/la3ibz-icon-mark.png',
        'brand/la3ibz-icon-mark-dark.png',
      ],
      manifest: {
        id: '/',
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
