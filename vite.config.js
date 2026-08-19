import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.mjs',
  },
  server: {
    host: true, // Allow external access
    allowedHosts: [
      'absen.sylink.my.id',
      'localhost',
      '127.0.0.1'
    ]
  }
})
