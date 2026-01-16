import tailwindcss from '@tailwindcss/vite'; // [!code ++]
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})