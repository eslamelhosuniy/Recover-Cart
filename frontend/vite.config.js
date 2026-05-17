import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'https://recover-a8a6585e.fastapicloud.dev',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
