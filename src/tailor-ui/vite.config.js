import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      // pass-thru to Flask at 127.0.0.1:5000
      '/api':  { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/auth': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    }
  },
  // Prevent Vite from pre-bundling the background-removal package and ORT
  optimizeDeps: {
    exclude: [
      '@imgly/background-removal',
      'onnxruntime-web',
      'onnxruntime-web/webgpu'
    ],
  },
})
