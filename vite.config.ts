import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/loro-parque-navigator/',
  // maplibre-gl instantiates its worker with `{ type: 'module' }`, so the
  // `?worker&url`-bundled maplibre-gl-worker chunk (src/map/init.ts) must be
  // emitted as an ES module, not Vite's default IIFE worker format.
  worker: { format: 'es' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Park Navigator — Unofficial Loro Parque Guide',
        short_name: 'ParkNav',
        description: 'Unofficial offline map and show planner for Loro Parque visitors.',
        theme_color: '#0F766E',
        background_color: '#EFE9DC',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // maplibre-gl-worker is bundled via `?worker&url` (src/map/init.ts) and
        // emitted as its own hashed .js chunk — already covered by the `js`
        // pattern below. `mjs` is kept for any other ESM asset that shows up;
        // it must stay covered or the map worker fails to load once the app
        // runs fully from the offline cache.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,webmanifest,geojson,json}'],
        globIgnores: ['**/data/shows.json'],
        runtimeCaching: [{
          urlPattern: /\/data\/shows\.json/,
          handler: 'NetworkFirst',
          options: { cacheName: 'shows', networkTimeoutSeconds: 4 }
        }]
      }
    })
  ],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    coverage: { provider: 'v8', include: ['src/**', 'scripts/lib/**'], exclude: ['src/main.ts', 'src/ui/**', 'src/map/init.ts'] }
  }
} as never);
