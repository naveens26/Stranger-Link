import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
      // Remove the babel config entirely
    }),
    tailwindcss()
  ],
  resolve: {
    alias: {
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      // Also add socket.io-client to prevent issues
      'socket.io-client': path.resolve(__dirname, './node_modules/socket.io-client')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'socket.io-client'],
    force: true
  },
  server: {
    port: 5175
  }
})