import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        // Enable service worker in dev so you can test offline refresh with `npm run dev`
        enabled: true,
      },
      // Use existing icons from the public/ folder so they are copied and precached
      includeAssets: [
        'favicon.ico',
        'browserconfig.xml',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-57x57.png',
        'favicon-60x60.png',
        'favicon-70x70.png',
        'favicon-72x72.png',
        'favicon-76x76.png',
        'favicon-96x96.png',
        'favicon-114x114.png',
        'favicon-120x120.png',
        'favicon-144x144.png',
        'favicon-150x150.png',
        'favicon-152x152.png',
        'favicon-180x180.png',
        'favicon-192x192.png',
        'favicon-310x310.png'
      ],
      manifest: {
        name: 'Taskin',
        short_name: 'Taskin',
        description: 'Simple todo management with categories',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // Advertise the icons that already live in public/
        icons: [
          { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/favicon-310x310.png', sizes: '310x310', type: 'image/png', purpose: 'any' },
          { src: '/favicon-180x180.png', sizes: '180x180', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && /^(categories|recommended-todos)/.test(url.pathname.replace('/api/', '')),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }
            }
          },
          {
            urlPattern: ({ request }) => (['script', 'style', 'image', 'font'] as string[]).indexOf(request.destination) !== -1,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets-cache' }
          }
        ]
      }
    })
  ],
  server: {
    allowedHosts: true,
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
