import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
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
