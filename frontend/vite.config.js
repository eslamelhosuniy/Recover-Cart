import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000/api/v1/',
        // target: 'https://recover-a8a6585e.fastapicloud.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
