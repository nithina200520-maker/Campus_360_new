import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:5001'
const flaskApiTarget = process.env.VITE_FLASK_API_TARGET || 'http://127.0.0.1:5000'
const vitePort = Number(process.env.VITE_PORT || 5173)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: vitePort,
    proxy: {
      '/api/campus-admin': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/api/students': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/api/faculty': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/admin': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/lost-found': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/canteen-admin': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/navigation': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/notifications': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/static': {
        target: flaskApiTarget,
        changeOrigin: true
      },
      '/api': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
})

