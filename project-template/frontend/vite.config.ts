import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path aliases - corresponds to tsconfig.json paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Dev server configuration
  server: {
    port: 5173,
    // Proxy API requests to backend
    // TODO: Change target to your backend URL
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  // Build optimizations
  build: {
    rollupOptions: {
      output: {
        // TODO: Add manual chunks for large libraries
        // Example:
        // manualChunks: {
        //   'vendor': ['react', 'react-dom', 'react-router-dom'],
        // },
      },
    },
  },
})
