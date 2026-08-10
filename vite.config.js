import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Yatama Attendance',
        short_name: 'Absensi',
        theme_color: '#4ade80',
        icons: [
          {
            src: 'https://raw.githubusercontent.com/vitejs/vite/main/docs/images/vite.svg', // Placeholder
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,jsx}']
      }
    })
  ],
  css: {
    postcss: './postcss.config.mjs',
  },
})
