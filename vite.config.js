import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4715',
        changeOrigin: true,
      },
      '/bpjph-api': {
        target: 'https://prod-api-si.halal.go.id',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/bpjph-api/, ''),
      },
    },
  },
})